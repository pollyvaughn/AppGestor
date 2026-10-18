from decimal import Decimal

from backend.database import get_connection
from fastapi import HTTPException


def crear_metodo_pago(metodo, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        conexion.start_transaction()

        sql = """
            INSERT INTO metodo_pago
            (usuario_id, tipo, nombre, moneda, estado, saldo)
            VALUES (%s, %s, %s, %s, 'ACTIVO', %s)
        """

        valores = (
            usuario_id,
            metodo.tipo,
            metodo.nombre,
            metodo.moneda,
            metodo.saldo
        )

        cursor.execute(sql, valores)

        metodo_id = cursor.lastrowid

        # Una cuenta que nace con plata registra ese saldo como un
        # movimiento SALDO_INICIAL. No pasa por actualizar_saldo porque
        # el saldo ya quedó guardado en el INSERT de arriba (si no, se
        # sumaría dos veces). Tampoco cuenta como ingreso en los reportes.
        if metodo.tipo != "TARJETA_CREDITO" and metodo.saldo > 0:
            cursor.execute(
                """
                INSERT INTO movimiento
                (
                    usuario_id,
                    categoria_id,
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
                    %s,
                    'SALDO_INICIAL',
                    'CONFIRMADO',
                    %s,
                    %s,
                    %s,
                    NOW()
                )
                """,
                (
                    usuario_id,
                    metodo_id,
                    "Saldo inicial",
                    metodo.saldo,
                    metodo.moneda
                )
            )

        conexion.commit()

        return metodo_id

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def listar_metodos_pago(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT id, tipo, nombre, moneda, saldo, estado
            FROM metodo_pago
            WHERE usuario_id = %s
            AND estado = 'ACTIVO'
            ORDER BY nombre
        """

        cursor.execute(sql, (usuario_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()


def editar_metodo_pago(metodo_id, metodo, usuario_id):
    if metodo.tipo == "TARJETA_CREDITO":
        raise HTTPException(
            status_code=400,
            detail="Las tarjetas se administran desde la pestaña Tarjetas"
        )

    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            UPDATE metodo_pago
            SET tipo = %s,
                nombre = %s,
                moneda = %s,
                saldo = %s
            WHERE id = %s
              AND usuario_id = %s
              AND estado = 'ACTIVO'
              AND tipo != 'TARJETA_CREDITO'
            """,
            (
                metodo.tipo,
                metodo.nombre,
                metodo.moneda,
                metodo.saldo,
                metodo_id,
                usuario_id
            )
        )
        conexion.commit()

        return cursor.rowcount

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def eliminar_metodo_pago(metodo_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT tipo
            FROM metodo_pago
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
            """,
            (metodo_id, usuario_id)
        )
        metodo = cursor.fetchone()

        if not metodo:
            return 0

        if metodo["tipo"] != "TARJETA_CREDITO":
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM metodo_pago
                WHERE usuario_id = %s
                AND estado = 'ACTIVO'
                AND tipo != 'TARJETA_CREDITO'
                """,
                (usuario_id,)
            )
            cantidad = cursor.fetchone()["total"]

            if cantidad <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede desactivar la última cuenta de dinero disponible"
                )

        sql = """
            UPDATE metodo_pago
            SET estado = 'INACTIVO'
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
        """

        cursor.execute(sql, (metodo_id, usuario_id))
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()