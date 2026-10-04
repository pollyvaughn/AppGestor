import { useEffect, useState } from "react"
import TarjetasPage from "./TarjetasPage"
import ComprasTarjetaPage from "./ComprasTarjetaPage"
import { listarTarjetas } from "../services/tarjetaService"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
}

export default function TarjetasYComprasPage() {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])

    async function cargarTarjetas() {
        const datos = await listarTarjetas()
        setTarjetas(datos)
    }

    useEffect(function () {
        cargarTarjetas()
    }, [])

    return (
        <>
            <TarjetasPage />

            <ComprasTarjetaPage tarjetas={tarjetas} />
        </>
    )
}