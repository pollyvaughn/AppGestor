from fastapi import HTTPException
from backend.database import get_connection
from datetime import date

from backend.services.saldo_service import actualizar_saldo, revertir_saldo

def validar_fecha_pago(fecha, fecha_compra):
    if fecha is None:
        return

    if fecha > date.today():
        raise HTTPException(
            status_code=400,
            detail="La fecha del pago no puede ser futura"
        )

    if fecha < fecha_compra.date():
        raise HTTPException(
            status_code=400,
            detail="El pago no puede ser anterior a la compra"
        )

def obtener_total_cuota(cursor, cuota_id):
    cursor.execute(
        """
        SELECT
            c.monto_base,
            COALESCE(
                SUM(
                    CASE
                        WHEN a.tipo IN (
                            'RECARGO',
                            'INTERES',
                            'COMISION',
                            'ADICIONAL'
                        )
                        THEN a.monto
                        WHEN a.tipo = 'DESCUENTO'
                        THEN -a.monto
                        ELSE 0
                    END
                ),
                0
            ) AS total_ajustes
        FROM cuota c
        LEFT JOIN ajuste a
            ON a.cuota_id = c.id
            AND a.estado = 'ACTIVO'
        WHERE c.id = %s
        GROUP BY c.id, c.monto_base
        """,
        (cuota_id,)
    )

    resultado = cursor.fetchone()

    if not resultado:
        return None

    return (
        float(resultado["monto_base"])
        + float(resultado["total_ajustes"])
    )

def crear_pago(pago, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                c.id,
                c.monto_pendiente,
                c.estado,
                c.numero,
                c.compra_tarjeta_id,
                ct.tarjeta_id,
                ct.fecha_compra,
                mp.moneda
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
                       INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE c.id = %s
              AND m.usuario_id = %s
            FOR UPDATE
            """,
            (pago.cuota_id, usuario_id)
        )

        cuota = cursor.fetchone()

        if not cuota:
            raise HTTPException(
                status_code=404,
                detail="Cuota no encontrada"
            )

        if cuota["estado"] in ("PAGADA", "OMITIDA", "ANULADA"):
            raise HTTPException(
                status_code=400,
                detail="No se puede registrar un pago sobre una cuota pagada, omitida o anulada"
            )

        if pago.monto <= 0:
            validar_fecha_pago(pago.fecha, cuota["fecha_compra"])
            raise HTTPException(
                status_code=400,
                detail="El monto debe ser mayor a 0"
            )

        if pago.monto > float(cuota["monto_pendiente"]):
            raise HTTPException(
                status_code=400,
                detail="El monto supera el pendiente de la cuota"
            )

        monto_metodos = sum(
            metodo.monto
            for metodo in pago.metodos
        )

        if round(monto_metodos, 2) != round(pago.monto, 2):
            raise HTTPException(
                status_code=400,
                detail="La suma de los métodos de pago debe coincidir con el monto del pago"
            )

        for metodo in pago.metodos:
            if metodo.monto <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="El monto de cada método debe ser mayor a 0"
                )

        cursor.execute(
            """
            SELECT id, numero, estado
            FROM cuota
            WHERE compra_tarjeta_id = %s
              AND numero < %s
              AND estado NOT IN ('PAGADA', 'OMITIDA')
            LIMIT 1
            """,
            (
                cuota["compra_tarjeta_id"],
                cuota["numero"]
            )
        )

        cuota_anterior = cursor.fetchone()

        if cuota_anterior:
            raise HTTPException(
                status_code=400,
                detail="Debes pagar las cuotas anteriores primero"
            )

        for metodo in pago.metodos:
            cursor.execute(
                """
                SELECT id, tipo, estado, moneda
                FROM metodo_pago
                WHERE id = %s
                  AND usuario_id = %s
                """,
                (
                    metodo.metodo_pago_id,
                    usuario_id
                )
            )

            metodo_pago = cursor.fetchone()

            if not metodo_pago:
                raise HTTPException(
                    status_code=403,
                    detail="Uno de los métodos de pago no pertenece al usuario"
                )

            if metodo_pago["estado"] != "ACTIVO":
                raise HTTPException(
                    status_code=400,
                    detail="Uno de los métodos de pago está inactivo"
                )

            if metodo_pago["tipo"] == "TARJETA_CREDITO":
                raise HTTPException(
                    status_code=400,
                    detail="No se puede pagar una tarjeta de crédito usando otra tarjeta de crédito"
                )

            if metodo_pago["moneda"] != cuota["moneda"]:
                raise HTTPException(
                    status_code=400,
                    detail="Los métodos de pago deben utilizar la misma moneda que la cuota"
                )

        cursor.execute(
            """
            INSERT INTO movimiento
            (
                usuario_id,
                metodo_pago_id,
                tipo,
                estado,
                descripcion,
                monto,
                moneda,
                fecha
            )
            VALUES (
                %s,
                NULL,
                'PAGO_TARJETA',
                'CONFIRMADO',
                %s,
                %s,
                %s,
                COALESCE(%s, CURDATE())
            )
            """,
            (
                usuario_id,
                "Pago de cuota",
                pago.monto,
                cuota["moneda"],
                pago.fecha
            )
        )

        movimiento_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO pago
            (
                cuota_id,
                movimiento_id,
                monto,
                moneda,
                fecha,
                estado
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                COALESCE(%s, CURDATE()),
                'CONFIRMADO'
            )
            """,
            (
                pago.cuota_id,
                movimiento_id,
                pago.monto,
                cuota["moneda"],
                pago.fecha
            )
        )

        pago_id = cursor.lastrowid

        for metodo in pago.metodos:
            cursor.execute(
                """
                INSERT INTO movimiento_metodo
                (
                    movimiento_id,
                    metodo_pago_id,
                    monto,
                    moneda
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    movimiento_id,
                    metodo.metodo_pago_id,
                    metodo.monto,
                    cuota["moneda"]
                )
            )

        for metodo in pago.metodos:
            actualizar_saldo(
                cursor,
                metodo.metodo_pago_id,
                metodo.monto,
                "EGRESO"
            )

        nuevo_pendiente = round(float(cuota["monto_pendiente"]) - pago.monto, 2)

        if nuevo_pendiente <= 0:
            nuevo_pendiente = 0
            nuevo_estado = "PAGADA"
        else:
            nuevo_estado = "PARCIAL"

        cursor.execute(
            """
            UPDATE cuota
            SET
                monto_pendiente = %s,
                estado = %s
            WHERE id = %s
            """,
            (
                nuevo_pendiente,
                nuevo_estado,
                pago.cuota_id
            )
        )

        conexion.commit()

        return {
            "mensaje": "Pago registrado correctamente",
            "pago_id": pago_id,
            "cuota_id": pago.cuota_id,
            "monto_pagado": pago.monto,
            "monto_pendiente": nuevo_pendiente,
            "estado": nuevo_estado
        }

    except HTTPException:
        conexion.rollback()
        raise

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def editar_pago(pago_id, pago, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.id,
                p.monto,
                p.moneda,
                p.estado,
                p.movimiento_id,
                p.cuota_id,
                c.monto_pendiente,
                c.estado AS cuota_estado,
                c.compra_tarjeta_id,
                c.numero,
                ct.fecha_compra
            FROM pago p
            INNER JOIN cuota c
                ON p.cuota_id = c.id
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON p.movimiento_id = m.id
            WHERE p.id = %s
              AND m.usuario_id = %s
            FOR UPDATE
            """,
            (
                pago_id,
                usuario_id
            )
        )

        pago_actual = cursor.fetchone()

        if not pago_actual:
            raise HTTPException(
                status_code=404,
                detail="Pago no encontrado"
            )

        if pago_actual["estado"] == "ANULADO":
            raise HTTPException(
                status_code=400,
                detail="No se puede editar un pago anulado"
            )

        if pago_actual["cuota_estado"] in ("OMITIDA", "ANULADA"):
            raise HTTPException(
                status_code=400,
                detail="No se puede editar un pago de una cuota omitida o anulada"
            )

        if pago.monto <= 0:
            validar_fecha_pago(pago.fecha, pago_actual["fecha_compra"])
            raise HTTPException(
                status_code=400,
                detail="El monto debe ser mayor a 0"
            )

        ids_metodos = [
            metodo.metodo_pago_id
            for metodo in pago.metodos
        ]

        if len(ids_metodos) != len(set(ids_metodos)):
            raise HTTPException(
                status_code=400,
                detail="No se puede repetir un método de pago"
            )

        monto_metodos = sum(
            metodo.monto
            for metodo in pago.metodos
        )

        if round(monto_metodos, 2) != round(pago.monto, 2):
            raise HTTPException(
                status_code=400,
                detail="La suma de los métodos de pago debe coincidir con el monto del pago"
            )

        for metodo in pago.metodos:
            if metodo.monto <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="El monto de cada método debe ser mayor a 0"
                )

        moneda = pago_actual["moneda"]

        for metodo in pago.metodos:
            cursor.execute(
                """
                SELECT id, tipo, estado, moneda
                FROM metodo_pago
                WHERE id = %s
                  AND usuario_id = %s
                """,
                (
                    metodo.metodo_pago_id,
                    usuario_id
                )
            )

            metodo_pago = cursor.fetchone()

            if not metodo_pago:
                raise HTTPException(
                    status_code=403,
                    detail="Uno de los métodos de pago no pertenece al usuario"
                )

            if metodo_pago["estado"] != "ACTIVO":
                raise HTTPException(
                    status_code=400,
                    detail="Uno de los métodos de pago está inactivo"
                )

            if metodo_pago["tipo"] == "TARJETA_CREDITO":
                raise HTTPException(
                    status_code=400,
                    detail="No se puede pagar una tarjeta de crédito usando otra tarjeta de crédito"
                )

            if metodo_pago["moneda"] != moneda:
                raise HTTPException(
                    status_code=400,
                    detail="Los métodos de pago deben utilizar la misma moneda que el pago"
                )

        total_cuota = obtener_total_cuota(
            cursor,
            pago_actual["cuota_id"])

        if total_cuota is None:
            raise HTTPException(
                status_code=404,
                detail="Cuota no encontrada")

        cursor.execute(
            """ 
            SELECT COALESCE(SUM(monto), 0) AS total_pagado 
            FROM pago WHERE cuota_id = %s 
            AND estado = 'CONFIRMADO' 
            AND id != %s 
            """,
            (
                pago_actual["cuota_id"],
                pago_id
            )
        )

        resultado = cursor.fetchone()

        total_otros_pagos = float(resultado["total_pagado"])

        nuevo_total_pagado = total_otros_pagos + pago.monto

        if round(nuevo_total_pagado, 2) > round(total_cuota, 2):
            raise HTTPException(
                status_code=400,
                detail="El monto editado supera el total pendiente disponible de la cuota"
            )

        nuevo_pendiente = round(
            total_cuota - nuevo_total_pagado,
            2
        )

        if nuevo_pendiente == 0:
            nuevo_estado = "PAGADA"
        elif nuevo_total_pagado == 0:
            nuevo_estado = "PENDIENTE"
        else:
            nuevo_estado = "PARCIAL"

        cursor.execute(
            """
            SELECT metodo_pago_id, monto
            FROM movimiento_metodo
            WHERE movimiento_id = %s
            """,
            (
                pago_actual["movimiento_id"],
            )
        )

        metodos_actuales = cursor.fetchall()

        for metodo in metodos_actuales:
            revertir_saldo(
                cursor,
                metodo["metodo_pago_id"],
                metodo["monto"],
                "EGRESO"
            )

        cursor.execute(
            """
            DELETE FROM movimiento_metodo
            WHERE movimiento_id = %s
            """,
            (
                pago_actual["movimiento_id"],
            )
        )

        for metodo in pago.metodos:
            cursor.execute(
                """
                INSERT INTO movimiento_metodo
                (
                    movimiento_id,
                    metodo_pago_id,
                    monto,
                    moneda
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    pago_actual["movimiento_id"],
                    metodo.metodo_pago_id,
                    metodo.monto,
                    moneda
                )
            )

        for metodo in pago.metodos:
            actualizar_saldo(
                cursor,
                metodo.metodo_pago_id,
                metodo.monto,
                "EGRESO"
            )

        cursor.execute(
            """
            UPDATE movimiento
            SET
                monto = %s,
                moneda = %s,
                fecha = COALESCE(%s, fecha)
            WHERE id = %s
            """,
            (
                pago.monto,
                moneda,
                pago.fecha,
                pago_actual["movimiento_id"]
            )
        )

        cursor.execute(
            """
            UPDATE pago
            SET
                monto = %s,
                moneda = %s
            WHERE id = %s
            """,
            (
                pago.monto,
                moneda,
                pago_id
            )
        )

        cursor.execute(
            """
            UPDATE cuota
            SET
                monto_pendiente = %s,
                estado = %s
            WHERE id = %s
            """,
            (
                nuevo_pendiente,
                nuevo_estado,
                pago_actual["cuota_id"]
            )
        )

        conexion.commit()

        return {
            "mensaje": "Pago actualizado correctamente",
            "pago_id": pago_id,
            "cuota_id": pago_actual["cuota_id"],
            "monto_pagado": pago.monto,
            "monto_pendiente": nuevo_pendiente,
            "estado": nuevo_estado
        }

    except HTTPException:
        conexion.rollback()
        raise

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def anular_pago(pago_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.id,
                p.monto,
                p.estado,
                p.movimiento_id,
                p.cuota_id,
                c.estado AS cuota_estado
            FROM pago p
            INNER JOIN movimiento m
                ON p.movimiento_id = m.id
            INNER JOIN cuota c
                ON p.cuota_id = c.id
            WHERE p.id = %s
              AND m.usuario_id = %s
            FOR UPDATE
            """,
            (pago_id, usuario_id)
        )

        pago_actual = cursor.fetchone()

        if not pago_actual:
            raise HTTPException(
                status_code=404,
                detail="Pago no encontrado"
            )

        if pago_actual["estado"] == "ANULADO":
            raise HTTPException(
                status_code=400,
                detail="El pago ya está anulado"
            )

        if pago_actual["estado"] != "CONFIRMADO":
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden anular pagos confirmados"
            )

        if pago_actual["cuota_estado"] in ("OMITIDA", "ANULADA"):
            raise HTTPException(
                status_code=400,
                detail="No se puede anular un pago de una cuota omitida o anulada"
            )

        # Calcular el total actual de la cuota, incluidos sus ajustes.
        total_cuota = obtener_total_cuota(
            cursor,
            pago_actual["cuota_id"]
        )

        if total_cuota is None:
            raise HTTPException(
                status_code=404,
                detail="Cuota no encontrada"
            )

        # Recalcular lo pagado sin contar el pago que se anulará.
        cursor.execute(
            """
            SELECT COALESCE(SUM(monto), 0) AS total_pagado
            FROM pago
            WHERE cuota_id = %s
              AND id != %s
              AND estado = 'CONFIRMADO'
            """,
            (
                pago_actual["cuota_id"],
                pago_id
            )
        )

        resultado = cursor.fetchone()
        total_pagado = float(resultado["total_pagado"])

        nuevo_pendiente = round(
            max(0, float(total_cuota) - total_pagado),
            2
        )

        if nuevo_pendiente == 0:
            nuevo_estado_cuota = "PAGADA"
        elif nuevo_pendiente >= round(float(total_cuota), 2):
            nuevo_estado_cuota = "PENDIENTE"
        else:
            nuevo_estado_cuota = "PARCIAL"

        # Recuperar los métodos usados en el pago original.
        cursor.execute(
            """
            SELECT metodo_pago_id, monto
            FROM movimiento_metodo
            WHERE movimiento_id = %s
            """,
            (pago_actual["movimiento_id"],)
        )

        metodos_pago = cursor.fetchall()

        # Revertir el efecto del pago en los saldos de esos métodos.
        for metodo in metodos_pago:
            revertir_saldo(
                cursor,
                metodo["metodo_pago_id"],
                metodo["monto"],
                "EGRESO"
            )

        # Marcar el pago y su movimiento como anulados.
        cursor.execute(
            """
            UPDATE pago
            SET estado = 'ANULADO'
            WHERE id = %s
            """,
            (pago_id,)
        )

        cursor.execute(
            """
            UPDATE pago
            SET
                monto = %s,
                moneda = %s,
                fecha = COALESCE(%s, fecha)
            WHERE id = %s
            """,
            (
                pago.monto,
                moneda,
                pago.fecha,
                pago_id
            )
        )

        # Actualizar el pendiente y estado de la cuota.
        cursor.execute(
            """
            UPDATE cuota
            SET
                monto_pendiente = %s,
                estado = %s
            WHERE id = %s
            """,
            (
                nuevo_pendiente,
                nuevo_estado_cuota,
                pago_actual["cuota_id"]
            )
        )

        # Registrar la anulación asociada al pago.
        cursor.execute(
            """
            INSERT INTO anulacion
            (
                movimiento_id,
                pago_id,
                motivo,
                fecha
            )
            VALUES (NULL, %s, %s, NOW())
            """,
            (
                pago_id,
                "Pago anulado"
            )
        )


        conexion.commit()

        return {
            "mensaje": "Pago anulado correctamente",
            "pago_id": pago_id,
            "cuota_id": pago_actual["cuota_id"],
            "monto_reintegrado": pago_actual["monto"],
            "monto_pendiente": nuevo_pendiente,
            "estado": nuevo_estado_cuota
        }

    except HTTPException:
        conexion.rollback()
        raise

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def listar_pagos_por_cuota(cuota_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.id,
                p.cuota_id,
                p.movimiento_id,
                p.monto,
                p.moneda,
                p.fecha,
                p.estado
            FROM pago p
            INNER JOIN movimiento m
                ON p.movimiento_id = m.id
            INNER JOIN cuota c
                ON p.cuota_id = c.id
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE p.cuota_id = %s
              AND m.usuario_id = %s
            ORDER BY p.fecha ASC, p.id ASC
            """,
            (
                cuota_id,
                usuario_id
            )
        )

        pagos = cursor.fetchall()

        for pago in pagos:
            cursor.execute(
                """
                SELECT
                    mm.metodo_pago_id,
                    mm.monto,
                    mm.moneda,
                    mp.nombre,
                    mp.tipo
                FROM movimiento_metodo mm
                INNER JOIN metodo_pago mp
                    ON mm.metodo_pago_id = mp.id
                WHERE mm.movimiento_id = %s
                ORDER BY mm.id ASC
                """,
                (
                    pago["movimiento_id"],
                )
            )

            pago["metodos"] = cursor.fetchall()

        return pagos

    finally:
        cursor.close()
        conexion.close()