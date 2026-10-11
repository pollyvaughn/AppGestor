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

export default function TarjetasYComprasPage() {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])

    async function cargarTarjetas() {
        try {
            const datos: Tarjeta[] = await listarTarjetas()

            // solo las activas se pueden usar para compras nuevas
            setTarjetas(datos)
                
                
        
        } catch {
            setTarjetas([])
        }
    }

    useEffect(function () {
        cargarTarjetas()
    }, [])

    return (
        <div className="space-y-10">
            <TarjetasPage onCambio={cargarTarjetas} />

            <ComprasTarjetaPage tarjetas={tarjetas} />
        </div>
    )
}