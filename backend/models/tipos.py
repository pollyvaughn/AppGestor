# =========================================================
# Tipos reutilizables para los modelos (punto 6)
# Un solo lugar para las validaciones que se repiten.
#
# MONTO_MAXIMO = 999.999.999.999 (12 dígitos enteros).
#   Las columnas son DECIMAL(15,2): 15 dígitos en total y 2 decimales,
#   o sea caben 13 enteros. Se usa 12 para dejar margen, porque los saldos
#   suman muchos movimientos. Sin tope, un monto gigante rompía en MySQL (500).
#
# Monto       -> número > 0, <= MONTO_MAXIMO, sin NaN ni infinito
# Nombre      -> texto sin espacios en los bordes, 1 a 100 caracteres
#                (VARCHAR(100)); "   " ya no pasa como nombre válido
# NombreLargo -> igual, hasta 150 caracteres (VARCHAR(150), recurrentes)
# Descripcion -> hasta 255 caracteres (VARCHAR(255))
# Color       -> hasta 20 caracteres (VARCHAR(20))
# Password    -> 8 a 128 caracteres (128 evita hashear textos enormes)
# =========================================================

from typing import Annotated

from pydantic import Field, StringConstraints

MONTO_MAXIMO = 999_999_999_999

Monto = Annotated[float, Field(gt=0, le=MONTO_MAXIMO, allow_inf_nan=False)]

Nombre = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]

NombreLargo = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
]

Descripcion = Annotated[str, StringConstraints(max_length=255)]

Color = Annotated[str, StringConstraints(max_length=20)]

Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]