from backend.database import get_connection


def omitir_cuota(cuota_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                c.id,
                c.numero,
                c.monto_pendiente,
                c.estado,
                c.compra_tarjeta_id,
                m.usuario_id
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE c.id = %s
            AND m.usuario_id = %s
            FOR UPDATE
            """,
            (
                cuota_id,
                usuario_id
            )
        )

        cuota = cursor.fetchone()

        if not cuota:
            raise ValueError("Cuota no encontrada")

        if cuota["estado"] != "PENDIENTE" and cuota["estado"] != "PARCIAL":
            raise ValueError("La cuota no se puede omitir")

        if cuota["monto_pendiente"] <= 0:
            raise ValueError("La cuota no tiene saldo pendiente")

        saldo_arrastrar = cuota["monto_pendiente"]

        cursor.execute(
            """
            SELECT
                id,
                numero,
                monto_base,
                estado,
                monto_pendiente
            FROM cuota
            WHERE compra_tarjeta_id = %s
            AND numero = %s
            FOR UPDATE
            """,
            (
                cuota["compra_tarjeta_id"],
                cuota["numero"] + 1
            )
        )

        siguiente_cuota = cursor.fetchone()

        if not siguiente_cuota:
            raise ValueError("No existe una cuota siguiente para arrastrar el saldo")

        cursor.execute(
            """
            UPDATE cuota
            SET
                estado = 'OMITIDA',
                monto_pendiente = 0
            WHERE id = %s
            """,
            (cuota_id,)
        )

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
            SELECT
                %s,
                'ADICIONAL',
                %s,
                mp.moneda,
                %s
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE c.id = %s
            """,
            (
                siguiente_cuota["id"],
                saldo_arrastrar,
                f"Saldo arrastrado de cuota {cuota['numero']}",
                cuota_id
            )
        )

        nuevo_pendiente = (
            siguiente_cuota["monto_pendiente"] + saldo_arrastrar
        )

        estado_siguiente = (
            "PAGADA"
            if nuevo_pendiente == 0
            else "PARCIAL"
        )

        cursor.execute(
            """
            UPDATE cuota
            SET
                monto_pendiente = %s,
                estado = %s,
                cuota_origen_id = %s
            WHERE id = %s
            """,
            (
                nuevo_pendiente,
                estado_siguiente,
                cuota_id,
                siguiente_cuota["id"]
            )
        )

        conexion.commit()

        return {
            "mensaje": "Cuota omitida correctamente",
            "cuota_id": cuota_id,
            "cuota_siguiente_id": siguiente_cuota["id"],
            "saldo_arrastrado": saldo_arrastrar,
            "nuevo_pendiente": nuevo_pendiente
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()