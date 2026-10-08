from backend.database import get_connection


def crear_ajuste(ajuste, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)
        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                c.id,
                mp.moneda
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE c.id = %s
            AND m.usuario_id = %s
            """,
            (ajuste.cuota_id, usuario_id)
        )

        cuota = cursor.fetchone()

        if not cuota:
            raise ValueError("Cuota no encontrada")

        if ajuste.tipo not in (
            "RECARGO",
            "INTERES",
            "COMISION",
            "DESCUENTO",
            "ADICIONAL"
        ):
            raise ValueError("Tipo de ajuste inválido")

        if ajuste.monto <= 0:
            raise ValueError("El monto del ajuste debe ser mayor a 0")

        cursor.execute(
            """
            INSERT INTO ajuste
            (
                cuota_id,
                tipo,
                monto,
                moneda,
                descripcion
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                ajuste.cuota_id,
                ajuste.tipo,
                ajuste.monto,
                cuota["moneda"],
                ajuste.descripcion
            )
        )

        ajuste_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo IN (
                                'RECARGO',
                                'INTERES',
                                'COMISION',
                                'ADICIONAL'
                            )
                            THEN monto
                            WHEN tipo = 'DESCUENTO'
                            THEN -monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_ajustes
            FROM ajuste
            WHERE cuota_id = %s
            AND estado = 'ACTIVO'
            """,
            (ajuste.cuota_id,)
        )

        resultado = cursor.fetchone()

        total_ajustes = resultado["total_ajustes"]

        cursor.execute(
            """
            SELECT
                monto_base
            FROM cuota
            WHERE id = %s
            """,
            (ajuste.cuota_id,)
        )

        cuota_base = cursor.fetchone()

        total_cuota = cuota_base["monto_base"] + total_ajustes

        if total_cuota <= 0:
            raise ValueError(
                "El ajuste no puede dejar el total de la cuota en cero o negativo"
            )
        
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(monto), 0) AS total_pagado
            FROM pago
            WHERE cuota_id = %s
            AND estado = 'CONFIRMADO'
            """,
            (ajuste.cuota_id,)
        )

        pagos = cursor.fetchone()

        total_pagado = pagos["total_pagado"]

        monto_pendiente = total_cuota - total_pagado

        if monto_pendiente < 0:
            monto_pendiente = 0

        estado = "PAGADA" if monto_pendiente == 0 else (
            "PARCIAL" if total_pagado > 0 else "PENDIENTE"
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
                monto_pendiente,
                estado,
                ajuste.cuota_id
            )
        )

        conexion.commit()

        return {
            "id": ajuste_id,
            "cuota_id": ajuste.cuota_id,
            "tipo": ajuste.tipo,
            "monto": ajuste.monto,
            "descripcion": ajuste.descripcion,
            "total_cuota": total_cuota,
            "monto_pendiente": monto_pendiente
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def listar_ajustes(cuota_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                a.id,
                a.cuota_id,
                a.tipo,
                a.monto,
                a.moneda,
                a.descripcion,
                a.estado,
                a.fecha
            FROM ajuste a
            INNER JOIN cuota c
                ON a.cuota_id = c.id
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE a.cuota_id = %s
            AND m.usuario_id = %s
            ORDER BY a.fecha DESC
            """,
            (cuota_id, usuario_id)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()

def anular_ajuste(ajuste_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)
        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                a.id,
                a.cuota_id,
                a.estado
            FROM ajuste a
            INNER JOIN cuota c
                ON a.cuota_id = c.id
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE a.id = %s
            AND m.usuario_id = %s
            """,
            (
                ajuste_id,
                usuario_id
            )
        )

        ajuste = cursor.fetchone()

        if not ajuste:
            raise ValueError("Ajuste no encontrado")

        if ajuste["estado"] == "ANULADO":
            raise ValueError("El ajuste ya está anulado")

        cursor.execute(
            """
            UPDATE ajuste
            SET estado = 'ANULADO'
            WHERE id = %s
            """,
            (ajuste_id,)
        )

        cursor.execute(
            """
            INSERT INTO anulacion (
                movimiento_id,
                pago_id,
                ajuste_id,
                motivo,
                fecha
            )
            VALUES (NULL, NULL, %s, %s, NOW())
            """,
            (
                ajuste_id,
                "Ajuste anulado"
            )
        )

        cursor.execute(
            """
            SELECT
                c.monto_base,
                COALESCE(
                    (
                        SELECT SUM(
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
                        )
                        FROM ajuste a
                        WHERE a.cuota_id = c.id
                        AND a.estado = 'ACTIVO'
                    ),
                    0
                ) AS total_ajustes,
                COALESCE(
                    (
                        SELECT SUM(p.monto)
                        FROM pago p
                        WHERE p.cuota_id = c.id
                        AND p.estado = 'CONFIRMADO'
                    ),
                    0
                ) AS total_pagado
            FROM cuota c
            WHERE c.id = %s
            """,
            (ajuste["cuota_id"],)
        )

        cuota = cursor.fetchone()

        total_cuota = (
            cuota["monto_base"]
            + cuota["total_ajustes"]
        )

        monto_pendiente = (
            total_cuota
            - cuota["total_pagado"]
        )

        if monto_pendiente < 0:
            monto_pendiente = 0

        estado = "PAGADA" if monto_pendiente == 0 else (
            "PARCIAL"
            if cuota["total_pagado"] > 0
            else "PENDIENTE"
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
                monto_pendiente,
                estado,
                ajuste["cuota_id"]
            )
        )

        conexion.commit()

        return {
            "mensaje": "Ajuste anulado correctamente",
            "ajuste_id": ajuste_id,
            "cuota_id": ajuste["cuota_id"]
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()