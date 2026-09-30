import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const securityLoader = document.getElementById("securityLoader");
const app = document.getElementById("app");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileMenu = document.getElementById("mobileMenu");
const sidebarClose = document.getElementById("sidebarClose");
const logoutButton = document.getElementById("logoutButton");

const sidebarUserName = document.getElementById("sidebarUserName");
const topbarUserName = document.getElementById("topbarUserName");
const sidebarAvatar = document.getElementById("sidebarAvatar");
const topbarAvatar = document.getElementById("topbarAvatar");

const resetSimulator = document.getElementById("resetSimulator");

const simulatedIncome = document.getElementById("simulatedIncome");
const simulatedExpenses = document.getElementById("simulatedExpenses");
const simulatedInvestments = document.getElementById("simulatedInvestments");
const simulatedRecurring = document.getElementById("simulatedRecurring");

const simulationMonths = document.getElementById("simulationMonths");
const simulationMonthsValue = document.getElementById("simulationMonthsValue");

const realCurrentBalance = document.getElementById("realCurrentBalance");
const realBalanceStatus = document.getElementById("realBalanceStatus");
const realAverageIncome = document.getElementById("realAverageIncome");
const realAverageExpenses = document.getElementById("realAverageExpenses");
const realRecurring = document.getElementById("realRecurring");

const simulatedNetFlow = document.getElementById("simulatedNetFlow");
const simulatedFlowStatus = document.getElementById("simulatedFlowStatus");
const simulatedBreakEven = document.getElementById("simulatedBreakEven");
const simulatedBreakEvenDate = document.getElementById("simulatedBreakEvenDate");
const simulatedFinalBalance = document.getElementById("simulatedFinalBalance");
const simulatedRecovered = document.getElementById("simulatedRecovered");

const periodIncome = document.getElementById("periodIncome");
const periodIncomeText = document.getElementById("periodIncomeText");
const periodExpenses = document.getElementById("periodExpenses");
const periodNetResult = document.getElementById("periodNetResult");
const simulationRecoveryPercent = document.getElementById("simulationRecoveryPercent");

const comparisonRealFlow = document.getElementById("comparisonRealFlow");
const comparisonSimulatedFlow = document.getElementById("comparisonSimulatedFlow");
const comparisonDifference = document.getElementById("comparisonDifference");
const comparisonDifferenceText = document.getElementById("comparisonDifferenceText");

const simulationTableBody = document.getElementById("simulationTableBody");
const simulationInsights = document.getElementById("simulationInsights");

let movimientos = [];
let recurrentes = [];
let configuracion = {};

let chart = null;

let estadoReal = {
    balanceInicial: -59999.99,
    balanceActual: 0,
    ingresoPromedio: 0,
    salidaPromedio: 0,
    recurrenteMensual: 0,
    flujoPromedio: 0
};

function redirigirLogin() {
    window.location.replace("index.html");
}

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");

    if (window.lucide) {
        lucide.createIcons();
    }
}

function abrirSidebar() {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("active");
}

function cerrarSidebar() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
}

mobileMenu?.addEventListener("click", abrirSidebar);
sidebarClose?.addEventListener("click", cerrarSidebar);
sidebarOverlay?.addEventListener("click", cerrarSidebar);

logoutButton?.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } finally {
        redirigirLogin();
    }
});

function obtenerIniciales(nombre) {
    const partes = String(nombre || "P")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!partes.length) {
        return "P";
    }

    if (partes.length === 1) {
        return partes[0].charAt(0).toUpperCase();
    }

    return (
        partes[0].charAt(0) +
        partes[1].charAt(0)
    ).toUpperCase();
}

function cargarUsuario(datos, usuario) {
    const nombre =
        datos?.nombre ||
        usuario.displayName ||
        usuario.email?.split("@")[0] ||
        "Usuario";

    const iniciales = obtenerIniciales(nombre);

    sidebarUserName.textContent = nombre;
    topbarUserName.textContent = nombre;

    sidebarAvatar.textContent = iniciales;
    topbarAvatar.textContent = iniciales;
}

async function obtenerUsuario(usuario) {
    const snapshot = await getDoc(
        doc(db, "usuarios", usuario.uid)
    );

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}

function moneda(valor) {
    const numero = Number(valor) || 0;

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(numero);
}

function monedaCompacta(valor) {
    const numero = Number(valor) || 0;
    const absoluto = Math.abs(numero);

    let resultado;

    if (absoluto >= 1000000) {
        resultado = `$${(absoluto / 1000000).toFixed(1)}M`;
    } else if (absoluto >= 1000) {
        resultado = `$${(absoluto / 1000).toFixed(1)}k`;
    } else {
        resultado = `$${absoluto.toFixed(0)}`;
    }

    return numero < 0
        ? `-${resultado}`
        : resultado;
}

function escapar(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto ?? "");
    return elemento.innerHTML;
}

function numeroPositivo(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.max(0, numero);
}

function normalizarTipo(tipo) {
    const valor = String(tipo || "")
        .trim()
        .toLowerCase();

    if (
        valor === "ingreso" ||
        valor === "ingresos" ||
        valor === "entrada"
    ) {
        return "ingreso";
    }

    if (
        valor === "egreso" ||
        valor === "egresos" ||
        valor === "gasto" ||
        valor === "salida"
    ) {
        return "egreso";
    }

    if (
        valor === "inversion" ||
        valor === "inversión" ||
        valor === "inversiones"
    ) {
        return "inversion";
    }

    return valor;
}

function obtenerMonto(movimiento) {
    return Math.abs(
        Number(
            movimiento?.monto ??
            movimiento?.cantidad ??
            movimiento?.importe ??
            0
        ) || 0
    );
}

function convertirFecha(valor) {
    if (!valor) {
        return null;
    }

    if (typeof valor.toDate === "function") {
        const fecha = valor.toDate();

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {
        const fecha = new Date(
            valor.seconds * 1000
        );

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime())
            ? null
            : valor;
    }

    if (typeof valor === "string") {
        const fechaSimple = valor.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (fechaSimple) {
            return new Date(
                Number(fechaSimple[1]),
                Number(fechaSimple[2]) - 1,
                Number(fechaSimple[3]),
                12,
                0,
                0
            );
        }

        const fecha = new Date(valor);

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha;
    }

    return null;
}

function obtenerFechaMovimiento(movimiento) {
    return convertirFecha(
        movimiento?.fecha ??
        movimiento?.fechaMovimiento ??
        movimiento?.creadoEn ??
        movimiento?.createdAt ??
        null
    );
}

function claveMes(fecha) {
    return `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
    ).padStart(2, "0")}`;
}

function sumarMeses(fecha, cantidad) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth() + cantidad,
        1
    );
}

function nombreMesCompleto(fecha) {
    return new Intl.DateTimeFormat(
        "es-MX",
        {
            month: "long",
            year: "numeric"
        }
    ).format(fecha);
}

function nombreMesCorto(fecha, incluirAnio = false) {
    return new Intl.DateTimeFormat(
        "es-MX",
        {
            month: "short",
            year: incluirAnio
                ? "2-digit"
                : undefined
        }
    ).format(fecha);
}

function capitalizar(texto) {
    const valor = String(texto || "");

    if (!valor) {
        return "";
    }

    return valor.charAt(0).toUpperCase() +
        valor.slice(1);
}

async function cargarMovimientos() {
    const snapshot = await getDocs(
        collection(
            db,
            "finanzas",
            "movimientos",
            "registros"
        )
    );

    movimientos = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function cargarRecurrentes() {
    try {
        const snapshot = await getDocs(
            collection(
                db,
                "finanzas",
                "recurrentes",
                "registros"
            )
        );

        recurrentes = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));
    } catch (error) {
        console.warn(
            "No se pudieron cargar los recurrentes:",
            error
        );

        recurrentes = [];
    }
}

async function cargarConfiguracion() {
    configuracion = {};

    const rutas = [
        ["finanzas", "configuracion"],
        ["configuracion", "finanzas"]
    ];

    for (const ruta of rutas) {
        try {
            const snapshot = await getDoc(
                doc(db, ...ruta)
            );

            if (snapshot.exists()) {
                configuracion = snapshot.data();
                return;
            }
        } catch (error) {
            console.warn(
                "No se encontró configuración en:",
                ruta.join("/")
            );
        }
    }
}

function obtenerBalanceInicial() {
    const posiblesValores = [
        configuracion.balanceInicial,
        configuracion.inversionInicial,
        configuracion.capitalInicial,
        configuracion.saldoInicial,
        configuracion.balance_inicial
    ];

    for (const valor of posiblesValores) {
        const numero = Number(valor);

        if (
            Number.isFinite(numero) &&
            numero !== 0
        ) {
            return numero;
        }
    }

    return -59999.99;
}

function calcularTotalesMovimientos() {
    let ingresos = 0;
    let egresos = 0;
    let inversiones = 0;

    movimientos.forEach(movimiento => {
        const tipo = normalizarTipo(
            movimiento.tipo
        );

        const monto = obtenerMonto(
            movimiento
        );

        if (tipo === "ingreso") {
            ingresos += monto;
        }

        if (tipo === "egreso") {
            egresos += monto;
        }

        if (tipo === "inversion") {
            inversiones += monto;
        }
    });

    return {
        ingresos,
        egresos,
        inversiones,
        flujo:
            ingresos -
            egresos -
            inversiones
    };
}

function montoMensualRecurrente(item) {
    const monto = Math.abs(
        Number(item?.monto) || 0
    );

    const frecuencia = String(
        item?.frecuencia || "mensual"
    )
        .trim()
        .toLowerCase();

    switch (frecuencia) {
        case "semanal":
            return monto * 52 / 12;

        case "quincenal":
            return monto * 24 / 12;

        case "mensual":
            return monto;

        case "bimestral":
            return monto / 2;

        case "trimestral":
            return monto / 3;

        case "semestral":
            return monto / 6;

        case "anual":
            return monto / 12;

        default:
            return monto;
    }
}

function calcularRecurrentesMensuales() {
    return recurrentes
        .filter(item => {
            const estado = String(
                item?.estado || "activo"
            )
                .trim()
                .toLowerCase();

            return estado === "activo";
        })
        .reduce(
            (total, item) =>
                total +
                montoMensualRecurrente(item),
            0
        );
}

function obtenerMesesHistoricos(cantidad = 12) {
    const hoy = new Date();
    const meses = [];

    for (
        let indice = cantidad - 1;
        indice >= 0;
        indice--
    ) {
        const fecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - indice,
            1
        );

        meses.push({
            fecha,
            clave: claveMes(fecha),
            ingresos: 0,
            egresos: 0,
            inversiones: 0,
            actividad: false
        });
    }

    movimientos.forEach(movimiento => {
        const fecha = obtenerFechaMovimiento(
            movimiento
        );

        if (!fecha) {
            return;
        }

        const mes = meses.find(
            item =>
                item.clave === claveMes(fecha)
        );

        if (!mes) {
            return;
        }

        const tipo = normalizarTipo(
            movimiento.tipo
        );

        const monto = obtenerMonto(
            movimiento
        );

        if (tipo === "ingreso") {
            mes.ingresos += monto;
        }

        if (tipo === "egreso") {
            mes.egresos += monto;
        }

        if (tipo === "inversion") {
            mes.inversiones += monto;
        }

        mes.actividad = true;
    });

    return meses;
}

function calcularPromediosReales() {
    const meses = obtenerMesesHistoricos(12);

    const mesesActivos = meses.filter(
        mes => mes.actividad
    );

    const recurrenteMensual =
        calcularRecurrentesMensuales();

    if (!mesesActivos.length) {
        return {
            ingreso: 0,
            egreso: 0,
            inversion: 0,
            salida: 0,
            recurrente: recurrenteMensual,
            flujo: -recurrenteMensual
        };
    }

    const totales = mesesActivos.reduce(
        (acumulado, mes) => {
            acumulado.ingresos += mes.ingresos;
            acumulado.egresos += mes.egresos;
            acumulado.inversiones += mes.inversiones;

            return acumulado;
        },
        {
            ingresos: 0,
            egresos: 0,
            inversiones: 0
        }
    );

    const cantidad = mesesActivos.length;

    const ingreso =
        totales.ingresos / cantidad;

    const egreso =
        totales.egresos / cantidad;

    const inversion =
        totales.inversiones / cantidad;

    const salida =
        egreso + inversion;

    const flujo =
        ingreso -
        salida -
        recurrenteMensual;

    return {
        ingreso,
        egreso,
        inversion,
        salida,
        recurrente: recurrenteMensual,
        flujo
    };
}

function calcularEstadoReal() {
    const balanceInicial =
        obtenerBalanceInicial();

    const totales =
        calcularTotalesMovimientos();

    const promedios =
        calcularPromediosReales();

    const balanceActual =
        balanceInicial +
        totales.flujo;

    estadoReal = {
        balanceInicial,
        balanceActual,
        ingresoPromedio:
            promedios.ingreso,
        salidaPromedio:
            promedios.salida,
        recurrenteMensual:
            promedios.recurrente,
        flujoPromedio:
            promedios.flujo
    };
}

function pintarEstadoReal() {
    realCurrentBalance.textContent =
        moneda(estadoReal.balanceActual);

    realCurrentBalance.classList.remove(
        "positive",
        "negative"
    );

    if (estadoReal.balanceActual < 0) {
        realCurrentBalance.classList.add(
            "negative"
        );

        realBalanceStatus.textContent =
            `${moneda(
                Math.abs(
                    estadoReal.balanceActual
                )
            )} por recuperar`;
    } else {
        realCurrentBalance.classList.add(
            "positive"
        );

        realBalanceStatus.textContent =
            "PMC se encuentra en balance positivo";
    }

    realAverageIncome.textContent =
        moneda(
            estadoReal.ingresoPromedio
        );

    realAverageExpenses.textContent =
        moneda(
            estadoReal.salidaPromedio
        );

    realRecurring.textContent =
        moneda(
            estadoReal.recurrenteMensual
        );
}

function colocarValoresIniciales() {
    simulatedIncome.value =
        redondearEntrada(
            estadoReal.ingresoPromedio
        );

    simulatedExpenses.value =
        redondearEntrada(
            estadoReal.salidaPromedio
        );

    simulatedInvestments.value = 0;

    simulatedRecurring.value =
        redondearEntrada(
            estadoReal.recurrenteMensual
        );

    simulationMonths.value = 12;
}

function redondearEntrada(valor) {
    const numero = Number(valor) || 0;

    return Math.round(numero * 100) / 100;
}

function obtenerValoresSimulacion() {
    return {
        ingreso:
            numeroPositivo(
                simulatedIncome.value
            ),

        egresos:
            numeroPositivo(
                simulatedExpenses.value
            ),

        inversiones:
            numeroPositivo(
                simulatedInvestments.value
            ),

        recurrentes:
            numeroPositivo(
                simulatedRecurring.value
            ),

        meses:
            Math.max(
                3,
                Math.min(
                    60,
                    Number(
                        simulationMonths.value
                    ) || 12
                )
            )
    };
}

function calcularSimulacion() {
    const valores =
        obtenerValoresSimulacion();

    const salidasMensuales =
        valores.egresos +
        valores.inversiones +
        valores.recurrentes;

    const flujoMensual =
        valores.ingreso -
        salidasMensuales;

    const resultadoPeriodo =
        flujoMensual *
        valores.meses;

    const balanceFinal =
        estadoReal.balanceActual +
        resultadoPeriodo;

    const ingresosPeriodo =
        valores.ingreso *
        valores.meses;

    const salidasPeriodo =
        salidasMensuales *
        valores.meses;

    const recuperadoDuranteEscenario =
        estadoReal.balanceActual < 0
            ? Math.max(
                0,
                Math.min(
                    Math.abs(
                        estadoReal.balanceActual
                    ),
                    balanceFinal -
                    estadoReal.balanceActual
                )
            )
            : 0;

    const baseInicial =
        Math.abs(
            Math.min(
                estadoReal.balanceInicial,
                0
            )
        );

    const recuperacionTotal =
        baseInicial > 0
            ? Math.max(
                0,
                Math.min(
                    100,
                    (
                        (
                            estadoReal.balanceInicial < 0
                                ? Math.max(
                                    0,
                                    Math.min(
                                        baseInicial,
                                        balanceFinal -
                                        estadoReal.balanceInicial
                                    )
                                )
                                : 0
                        ) /
                        baseInicial
                    ) * 100
                )
            )
            : balanceFinal >= 0
                ? 100
                : 0;

    let mesesEquilibrio = null;

    if (estadoReal.balanceActual >= 0) {
        mesesEquilibrio = 0;
    } else if (flujoMensual > 0) {
        mesesEquilibrio = Math.ceil(
            Math.abs(
                estadoReal.balanceActual
            ) /
            flujoMensual
        );
    }

    let fechaEquilibrio = null;

    if (mesesEquilibrio === 0) {
        fechaEquilibrio = new Date();
    } else if (
        mesesEquilibrio !== null
    ) {
        fechaEquilibrio = sumarMeses(
            new Date(),
            mesesEquilibrio
        );
    }

    return {
        ...valores,
        salidasMensuales,
        flujoMensual,
        resultadoPeriodo,
        balanceFinal,
        ingresosPeriodo,
        salidasPeriodo,
        recuperadoDuranteEscenario,
        recuperacionTotal,
        mesesEquilibrio,
        fechaEquilibrio
    };
}

function aplicarClaseMonetaria(
    elemento,
    valor
) {
    elemento.classList.remove(
        "positive",
        "negative"
    );

    if (valor > 0) {
        elemento.classList.add(
            "positive"
        );
    }

    if (valor < 0) {
        elemento.classList.add(
            "negative"
        );
    }
}

function pintarResultados(resultado) {
    simulationMonthsValue.textContent =
        `${resultado.meses} ${
            resultado.meses === 1
                ? "mes"
                : "meses"
        }`;

    simulatedNetFlow.textContent =
        moneda(resultado.flujoMensual);

    aplicarClaseMonetaria(
        simulatedNetFlow,
        resultado.flujoMensual
    );

    if (resultado.flujoMensual > 0) {
        simulatedFlowStatus.textContent =
            "El escenario genera recuperación mensual";
    } else if (
        resultado.flujoMensual < 0
    ) {
        simulatedFlowStatus.textContent =
            "El escenario aumenta el capital por recuperar";
    } else {
        simulatedFlowStatus.textContent =
            "El escenario no genera avance financiero";
    }

    if (resultado.mesesEquilibrio === 0) {
        simulatedBreakEven.textContent =
            "Alcanzado";

        simulatedBreakEvenDate.textContent =
            "Balance positivo actual";
    } else if (
        resultado.mesesEquilibrio !== null
    ) {
        simulatedBreakEven.textContent =
            `≈ ${resultado.mesesEquilibrio} ${
                resultado.mesesEquilibrio === 1
                    ? "mes"
                    : "meses"
            }`;

        simulatedBreakEvenDate.textContent =
            capitalizar(
                nombreMesCompleto(
                    resultado.fechaEquilibrio
                )
            );
    } else {
        simulatedBreakEven.textContent =
            "Sin estimación";

        simulatedBreakEvenDate.textContent =
            "Se requiere flujo positivo";
    }

    simulatedFinalBalance.textContent =
        moneda(resultado.balanceFinal);

    aplicarClaseMonetaria(
        simulatedFinalBalance,
        resultado.balanceFinal
    );

    simulatedRecovered.textContent =
        moneda(
            resultado.recuperadoDuranteEscenario
        );

    periodIncome.textContent =
        moneda(resultado.ingresosPeriodo);

    periodIncomeText.textContent =
        `${resultado.meses} ${
            resultado.meses === 1
                ? "mes simulado"
                : "meses simulados"
        }`;

    periodExpenses.textContent =
        moneda(resultado.salidasPeriodo);

    periodNetResult.textContent =
        moneda(resultado.resultadoPeriodo);

    aplicarClaseMonetaria(
        periodNetResult,
        resultado.resultadoPeriodo
    );

    simulationRecoveryPercent.textContent =
        `${resultado.recuperacionTotal.toFixed(1)}%`;

    pintarComparacion(resultado);
    pintarTabla(resultado);
    pintarGrafica(resultado);
    pintarInsights(resultado);
}

function pintarComparacion(resultado) {
    const real =
        estadoReal.flujoPromedio;

    const simulado =
        resultado.flujoMensual;

    const diferencia =
        simulado - real;

    comparisonRealFlow.textContent =
        moneda(real);

    comparisonSimulatedFlow.textContent =
        moneda(simulado);

    comparisonDifference.textContent =
        `${diferencia > 0 ? "+" : ""}${moneda(diferencia)}`;

    aplicarClaseMonetaria(
        comparisonRealFlow,
        real
    );

    aplicarClaseMonetaria(
        comparisonSimulatedFlow,
        simulado
    );

    aplicarClaseMonetaria(
        comparisonDifference,
        diferencia
    );

    if (diferencia > 0) {
        comparisonDifferenceText.textContent =
            "Mejora frente a la tendencia actual";
    } else if (diferencia < 0) {
        comparisonDifferenceText.textContent =
            "Resultado inferior a la tendencia actual";
    } else {
        comparisonDifferenceText.textContent =
            "Sin variación frente a la tendencia actual";
    }
}

function generarMeses(resultado) {
    const registros = [];

    let balance =
        estadoReal.balanceActual;

    for (
        let indice = 1;
        indice <= resultado.meses;
        indice++
    ) {
        const fecha = sumarMeses(
            new Date(),
            indice
        );

        balance +=
            resultado.flujoMensual;

        registros.push({
            indice,
            fecha,
            ingreso:
                resultado.ingreso,
            salidas:
                resultado.salidasMensuales,
            flujo:
                resultado.flujoMensual,
            balance
        });
    }

    return registros;
}

function pintarTabla(resultado) {
    const meses =
        generarMeses(resultado);

    simulationTableBody.innerHTML =
        meses
            .map(mes => {
                let estado;
                let claseEstado;

                if (mes.balance >= 0) {
                    estado =
                        "Equilibrio";
                    claseEstado =
                        "positive";
                } else if (
                    mes.flujo > 0
                ) {
                    estado =
                        "Recuperando";
                    claseEstado =
                        "recovering";
                } else {
                    estado =
                        "Negativo";
                    claseEstado =
                        "negative";
                }

                const claseFlujo =
                    mes.flujo > 0
                        ? "positive"
                        : mes.flujo < 0
                            ? "negative"
                            : "neutral";

                const claseBalance =
                    mes.balance >= 0
                        ? "positive"
                        : "negative";

                return `
                    <tr>
                        <td>
                            ${escapar(
                                capitalizar(
                                    nombreMesCompleto(
                                        mes.fecha
                                    )
                                )
                            )}
                        </td>

                        <td class="positive">
                            ${moneda(
                                mes.ingreso
                            )}
                        </td>

                        <td class="negative">
                            ${moneda(
                                mes.salidas
                            )}
                        </td>

                        <td class="${claseFlujo}">
                            ${
                                mes.flujo > 0
                                    ? "+"
                                    : ""
                            }${moneda(
                                mes.flujo
                            )}
                        </td>

                        <td class="${claseBalance}">
                            ${moneda(
                                mes.balance
                            )}
                        </td>

                        <td>
                            <span class="simulation-status ${claseEstado}">
                                ${estado}
                            </span>
                        </td>
                    </tr>
                `;
            })
            .join("");
}

function pintarGrafica(resultado) {
    const canvas =
        document.getElementById(
            "simulationChart"
        );

    if (!canvas) {
        return;
    }

    const meses =
        generarMeses(resultado);

    const labels = [
        "Actual",
        ...meses.map(mes =>
            nombreMesCorto(
                mes.fecha,
                resultado.meses > 18
            )
        )
    ];

    const balances = [
        estadoReal.balanceActual,
        ...meses.map(
            mes => mes.balance
        )
    ];

    const equilibrio =
        labels.map(() => 0);

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(
        canvas,
        {
            type: "line",

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Balance proyectado",

                        data:
                            balances,

                        borderColor:
                            "#20a9ff",

                        backgroundColor:
                            "rgba(32,169,255,.10)",

                        borderWidth: 2,
                        tension: .3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: true
                    },
                    {
                        label:
                            "Punto de equilibrio",

                        data:
                            equilibrio,

                        borderColor:
                            "rgba(255,255,255,.20)",

                        borderWidth: 1,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor:
                            "#101720",

                        borderColor:
                            "rgba(255,255,255,.07)",

                        borderWidth: 1,

                        callbacks: {
                            label: context => {
                                if (
                                    context.dataset.label ===
                                    "Punto de equilibrio"
                                ) {
                                    return "Equilibrio: $0.00";
                                }

                                return `Balance: ${moneda(
                                    context.raw
                                )}`;
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        border: {
                            display: false
                        },

                        grid: {
                            display: false
                        },

                        ticks: {
                            color: "#53606b",
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14
                        }
                    },

                    y: {
                        border: {
                            display: false
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,.04)"
                        },

                        ticks: {
                            color: "#53606b",

                            callback: valor =>
                                monedaCompacta(
                                    valor
                                )
                        }
                    }
                }
            }
        }
    );
}

function crearInsight(
    tipo,
    icono,
    titulo,
    descripcion
) {
    return `
        <div class="simulation-insight ${tipo}">

            <div class="simulation-insight-icon">
                <i data-lucide="${icono}"></i>
            </div>

            <div>
                <strong>
                    ${escapar(titulo)}
                </strong>

                <p>
                    ${escapar(descripcion)}
                </p>
            </div>

        </div>
    `;
}

function pintarInsights(resultado) {
    const insights = [];

    if (resultado.flujoMensual > 0) {
        insights.push(
            crearInsight(
                "positive",
                "trending-up",
                "Escenario favorable",
                `PMC avanzaría aproximadamente ${moneda(
                    resultado.flujoMensual
                )} cada mes bajo este escenario.`
            )
        );
    } else if (
        resultado.flujoMensual < 0
    ) {
        insights.push(
            crearInsight(
                "negative",
                "trending-down",
                "Escenario deficitario",
                `Las salidas superarían a los ingresos por aproximadamente ${moneda(
                    Math.abs(
                        resultado.flujoMensual
                    )
                )} cada mes.`
            )
        );
    } else {
        insights.push(
            crearInsight(
                "warning",
                "minus",
                "Escenario sin avance",
                "Los ingresos y las salidas mensuales serían iguales."
            )
        );
    }

    if (
        estadoReal.balanceActual < 0 &&
        resultado.mesesEquilibrio !== null
    ) {
        if (
            resultado.mesesEquilibrio <=
            resultado.meses
        ) {
            insights.push(
                crearInsight(
                    "positive",
                    "circle-check",
                    "Equilibrio dentro del periodo",
                    `El escenario permitiría alcanzar el punto de equilibrio aproximadamente en ${resultado.mesesEquilibrio} ${
                        resultado.mesesEquilibrio === 1
                            ? "mes"
                            : "meses"
                    }.`
                )
            );
        } else {
            insights.push(
                crearInsight(
                    "info",
                    "calendar-clock",
                    "Recuperación a largo plazo",
                    `El equilibrio requeriría aproximadamente ${resultado.mesesEquilibrio} meses, por lo que no se alcanzaría dentro de los ${resultado.meses} meses seleccionados.`
                )
            );
        }
    }

    if (
        estadoReal.balanceActual < 0 &&
        resultado.mesesEquilibrio === null
    ) {
        insights.push(
            crearInsight(
                "warning",
                "triangle-alert",
                "Sin fecha de recuperación",
                "Este escenario no genera un flujo positivo suficiente para reducir el capital pendiente."
            )
        );
    }

    const diferencia =
        resultado.flujoMensual -
        estadoReal.flujoPromedio;

    if (diferencia > 0) {
        insights.push(
            crearInsight(
                "info",
                "git-compare-arrows",
                "Mejora sobre la tendencia real",
                `El escenario mejora el flujo mensual en ${moneda(
                    diferencia
                )} respecto al comportamiento financiero actual.`
            )
        );
    } else if (diferencia < 0) {
        insights.push(
            crearInsight(
                "warning",
                "git-compare-arrows",
                "Menor rendimiento",
                `El escenario empeora el flujo mensual en ${moneda(
                    Math.abs(diferencia)
                )} respecto a la tendencia actual.`
            )
        );
    }

    if (resultado.balanceFinal >= 0) {
        insights.push(
            crearInsight(
                "positive",
                "badge-check",
                "Balance final positivo",
                `Al terminar el periodo seleccionado, el balance proyectado sería de ${moneda(
                    resultado.balanceFinal
                )}.`
            )
        );
    } else {
        insights.push(
            crearInsight(
                "info",
                "wallet-cards",
                "Capital pendiente",
                `Al finalizar la simulación todavía quedarían aproximadamente ${moneda(
                    Math.abs(
                        resultado.balanceFinal
                    )
                )} por recuperar.`
            )
        );
    }

    simulationInsights.innerHTML =
        insights
            .slice(0, 4)
            .join("");

    if (window.lucide) {
        lucide.createIcons();
    }
}

function ejecutarSimulacion() {
    const resultado =
        calcularSimulacion();

    pintarResultados(resultado);
}

function restablecerSimulador() {
    colocarValoresIniciales();
    ejecutarSimulacion();
}

[
    simulatedIncome,
    simulatedExpenses,
    simulatedInvestments,
    simulatedRecurring
].forEach(input => {
    input?.addEventListener(
        "input",
        ejecutarSimulacion
    );

    input?.addEventListener(
        "change",
        ejecutarSimulacion
    );
});

simulationMonths?.addEventListener(
    "input",
    ejecutarSimulacion
);

simulationMonths?.addEventListener(
    "change",
    ejecutarSimulacion
);

resetSimulator?.addEventListener(
    "click",
    restablecerSimulador
);

async function cargarSistema() {
    await Promise.all([
        cargarMovimientos(),
        cargarRecurrentes(),
        cargarConfiguracion()
    ]);

    calcularEstadoReal();
    pintarEstadoReal();

    colocarValoresIniciales();
    ejecutarSimulacion();
}

onAuthStateChanged(
    auth,
    async usuario => {
        if (!usuario) {
            redirigirLogin();
            return;
        }

        try {
            const datos =
                await obtenerUsuario(
                    usuario
                );

            if (
                !datos ||
                datos?.permisos?.finanzas !== true
            ) {
                await signOut(auth);
                redirigirLogin();
                return;
            }

            cargarUsuario(
                datos,
                usuario
            );

            await cargarSistema();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error cargando el simulador:",
                error
            );

            securityLoader.innerHTML = `
                <div class="security-loader-content">
                    <span>
                        No fue posible cargar el simulador financiero.
                    </span>
                </div>
            `;
        }
    }
);