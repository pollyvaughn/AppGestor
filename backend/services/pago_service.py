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

        if pago.monto > float(cuota["monto_pendiente"]):
            raise HTTPException(
                status_code=400,
                detail="El monto supera el pendiente de la cuota"
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

        cursor.execute(
            """
            SELECT u.id
            FROM usuario u
            INNER JOIN metodo_pago mp
                ON mp.usuario_id = u.id
            INNER JOIN tarjeta_credito tc
                ON tc.metodo_pago_id = mp.id
            WHERE tc.id = %s
              AND u.id = %s
            """,
            (cuota["tarjeta_id"], usuario_id)
        )

        usuario = cursor.fetchone()

        if not usuario:
            raise HTTPException(
                status_code=403,
                detail="La cuota no pertenece al usuario"
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

        nuevo_pendiente = float(cuota["monto_pendiente"]) - pago.monto

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