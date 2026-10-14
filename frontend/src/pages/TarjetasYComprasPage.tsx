import { useEffect, useState } from "react"
import TarjetasPage from "./TarjetasPage"
import ComprasTarjetaPage from "./ComprasTarjetaPage"
import { listarTarjetas } from "../services/tarjetaService"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
}

type TarjetasYComprasPageProps = {
    onIrACategorias: () => void
}

export default function TarjetasYComprasPage({
    onIrACategorias,
}: TarjetasYComprasPageProps) {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    const [version, setVersion] = useState(0)

    async function cargarTarjetas() {
        try {
            setTarjetas(await listarTarjetas())
        } catch {
            setTarjetas([])
        }
    }

    // vuelve a cargar también el panel de tarjetas (deuda y disponible)
    function refrescarTodo() {
        setVersion(function (v) {
            return v + 1
        })
        cargarTarjetas()
    }

    useEffect(function () {
        cargarTarjetas()
    }, [])

    return (
        <div className="space-y-10">
            <TarjetasPage key={version} onCambio={cargarTarjetas} />

            <ComprasTarjetaPage
                tarjetas={tarjetas}
                onCambio={refrescarTodo}
                onIrACategorias={onIrACategorias}
            />
        </div>
    )
}