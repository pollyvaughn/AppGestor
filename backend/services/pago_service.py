from fastapi import HTTPException
from backend.database import get_connection


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
                mp.moneda
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE c.id = %s
            """,
            (pago.cuota_id,)
        )

        cuota = cursor.fetchone()

        if not cuota:
            raise HTTPException(
                status_code=404,
                detail="Cuota no encontrada"
            )

        if cuota["estado"] == "PAGADA":
            raise HTTPException(
                status_code=400,
                detail="La cuota ya está pagada"
            )

        if pago.monto <= 0:
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
              AND estado != 'PAGADA'
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
                SELECT id, estado, moneda
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
                CURDATE()
            )
            """,
            (
                usuario_id,
                "Pago de cuota",
                pago.monto,
                cuota["moneda"]
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
                CURDATE(),
                'CONFIRMADO'
            )
            """,
            (
                pago.cuota_id,
                movimiento_id,
                pago.monto,
                cuota["moneda"]
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

        nuevo_pendiente = (
            float(cuota["monto_pendiente"]) - pago.monto
        )

        if nuevo_pendiente == 0:
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