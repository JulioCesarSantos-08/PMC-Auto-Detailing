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

const analysisPeriod = document.getElementById("analysisPeriod");

const currentBalance = document.getElementById("currentBalance");
const balanceDescription = document.getElementById("balanceDescription");

const recoveryPercentage = document.getElementById("recoveryPercentage");
const initialInvestment = document.getElementById("initialInvestment");
const recoveredCapital = document.getElementById("recoveredCapital");

const periodIncome = document.getElementById("periodIncome");
const periodExpenses = document.getElementById("periodExpenses");
const periodInvestments = document.getElementById("periodInvestments");
const periodNetFlow = document.getElementById("periodNetFlow");

const incomeComparison = document.getElementById("incomeComparison");
const expenseComparison = document.getElementById("expenseComparison");
const investmentComparison = document.getElementById("investmentComparison");
const flowDescription = document.getElementById("flowDescription");

const healthRing = document.getElementById("healthRing");
const healthScore = document.getElementById("healthScore");
const healthLabel = document.getElementById("healthLabel");

const incomeExpenseRatio = document.getElementById("incomeExpenseRatio");
const monthlyNetAverage = document.getElementById("monthlyNetAverage");
const positiveMonths = document.getElementById("positiveMonths");
const negativeMonths = document.getElementById("negativeMonths");

const expenseDistributionTotal = document.getElementById("expenseDistributionTotal");
const expenseCategoryList = document.getElementById("expenseCategoryList");

const monthlyRecurring = document.getElementById("monthlyRecurring");
const annualRecurring = document.getElementById("annualRecurring");
const recurringCount = document.getElementById("recurringCount");
const recurringIncomeImpact = document.getElementById("recurringIncomeImpact");
const recurringImpactBar = document.getElementById("recurringImpactBar");

const monthRanking = document.getElementById("monthRanking");
const financialInsights = document.getElementById("financialInsights");

let movimientos = [];
let recurrentes = [];
let configuracion = {};

let financialEvolutionChart = null;
let expenseDistributionChart = null;

function redirigirLogin() {
    window.location.replace("index.html");
}

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");
    lucide.createIcons();
}

function obtenerIniciales(nombre) {
    const partes = String(nombre || "P")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!partes.length) {
        return "P";
    }

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
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

    return snapshot.exists()
        ? snapshot.data()
        : null;
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
    await signOut(auth);
    redirigirLogin();
});

function moneda(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(Number(valor) || 0);
}

function monedaCompacta(valor) {
    const numero = Math.abs(Number(valor) || 0);

    if (numero >= 1000000) {
        return `$${(numero / 1000000).toFixed(1)}M`;
    }

    if (numero >= 1000) {
        return `$${(numero / 1000).toFixed(1)}k`;
    }

    return `$${numero.toFixed(0)}`;
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = String(texto ?? "");
    return div.innerHTML;
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
            movimiento.monto ??
            movimiento.cantidad ??
            movimiento.importe ??
            0
        ) || 0
    );
}

function convertirTimestamp(valor) {
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
        const fecha = new Date(valor.seconds * 1000);

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
        const simple = valor.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (simple) {
            return new Date(
                Number(simple[1]),
                Number(simple[2]) - 1,
                Number(simple[3]),
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
    return convertirTimestamp(
        movimiento.fecha ??
        movimiento.fechaMovimiento ??
        movimiento.creadoEn ??
        movimiento.createdAt ??
        null
    );
}

function inicioMes(fecha) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        1,
        0,
        0,
        0,
        0
    );
}

function finMes(fecha) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
    );
}

function restarMeses(fecha, cantidad) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth() - cantidad,
        1
    );
}

function claveMes(fecha) {
    return `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
    ).padStart(2, "0")}`;
}

function nombreMes(fecha, largo = false) {
    return new Intl.DateTimeFormat(
        "es-MX",
        {
            month: largo ? "long" : "short",
            year: largo ? "numeric" : undefined
        }
    ).format(fecha);
}

function capitalizar(texto) {
    const valor = String(texto || "");

    if (!valor) {
        return "";
    }

    return valor.charAt(0).toUpperCase() + valor.slice(1);
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

    const posiblesDocumentos = [
        ["finanzas", "configuracion"],
        ["configuracion", "finanzas"]
    ];

    for (const ruta of posiblesDocumentos) {
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
                "Configuración no encontrada en:",
                ruta.join("/")
            );
        }
    }
}

function obtenerBalanceInicial() {
    const posibles = [
        configuracion.balanceInicial,
        configuracion.inversionInicial,
        configuracion.capitalInicial,
        configuracion.saldoInicial,
        configuracion.balance_inicial
    ];

    for (const valor of posibles) {
        const numero = Number(valor);

        if (Number.isFinite(numero) && numero !== 0) {
            return numero;
        }
    }

    return -59999.99;
}

function calcularTotales(lista) {
    let ingresos = 0;
    let egresos = 0;
    let inversiones = 0;

    lista.forEach(movimiento => {
        const tipo = normalizarTipo(movimiento.tipo);
        const monto = obtenerMonto(movimiento);

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
        flujo: ingresos - egresos - inversiones
    };
}

function calcularBalanceActual() {
    const inicial = obtenerBalanceInicial();
    const totales = calcularTotales(movimientos);

    return inicial + totales.flujo;
}

function calcularRecuperacion() {
    const inicial = obtenerBalanceInicial();
    const actual = calcularBalanceActual();

    if (inicial >= 0) {
        return {
            base: Math.abs(inicial),
            recuperado: 0,
            porcentaje: 0
        };
    }

    const base = Math.abs(inicial);

    const recuperado = Math.max(
        0,
        Math.min(
            base,
            actual - inicial
        )
    );

    const porcentaje =
        base > 0
            ? (recuperado / base) * 100
            : 0;

    return {
        base,
        recuperado,
        porcentaje
    };
}

function obtenerPeriodoActual(cantidadMeses) {
    const hoy = new Date();

    const inicio = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - cantidadMeses + 1,
        1,
        0,
        0,
        0,
        0
    );

    const fin = new Date();

    fin.setHours(23, 59, 59, 999);

    return {
        inicio,
        fin
    };
}

function obtenerPeriodoAnterior(cantidadMeses) {
    const actual = obtenerPeriodoActual(cantidadMeses);

    const fin = new Date(
        actual.inicio.getFullYear(),
        actual.inicio.getMonth(),
        0,
        23,
        59,
        59,
        999
    );

    const inicio = new Date(
        fin.getFullYear(),
        fin.getMonth() - cantidadMeses + 1,
        1,
        0,
        0,
        0,
        0
    );

    return {
        inicio,
        fin
    };
}

function filtrarPeriodo(lista, inicio, fin) {
    return lista.filter(movimiento => {
        const fecha = obtenerFechaMovimiento(movimiento);

        if (!fecha) {
            return false;
        }

        return fecha >= inicio && fecha <= fin;
    });
}

function comparacionPorcentual(actual, anterior) {
    if (anterior === 0) {
        if (actual === 0) {
            return null;
        }

        return {
            porcentaje: 100,
            direccion: "up",
            nuevo: true
        };
    }

    const porcentaje =
        ((actual - anterior) / Math.abs(anterior)) * 100;

    return {
        porcentaje: Math.abs(porcentaje),
        direccion: porcentaje >= 0 ? "up" : "down",
        nuevo: false
    };
}

function textoComparacion(actual, anterior) {
    const comparacion = comparacionPorcentual(
        actual,
        anterior
    );

    if (!comparacion) {
        return "Sin variación frente al periodo anterior";
    }

    if (comparacion.nuevo) {
        return "Actividad nueva frente al periodo anterior";
    }

    const signo =
        comparacion.direccion === "up"
            ? "↑"
            : "↓";

    return `${signo} ${comparacion.porcentaje.toFixed(1)}% frente al periodo anterior`;
}

function obtenerMeses(cantidad) {
    const hoy = new Date();
    const meses = [];

    for (let i = cantidad - 1; i >= 0; i--) {
        const fecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - i,
            1
        );

        meses.push({
            fecha,
            clave: claveMes(fecha),
            ingresos: 0,
            egresos: 0,
            inversiones: 0,
            flujo: 0
        });
    }

    movimientos.forEach(movimiento => {
        const fecha = obtenerFechaMovimiento(movimiento);

        if (!fecha) {
            return;
        }

        const clave = claveMes(fecha);

        const mes = meses.find(
            item => item.clave === clave
        );

        if (!mes) {
            return;
        }

        const tipo = normalizarTipo(movimiento.tipo);
        const monto = obtenerMonto(movimiento);

        if (tipo === "ingreso") {
            mes.ingresos += monto;
        }

        if (tipo === "egreso") {
            mes.egresos += monto;
        }

        if (tipo === "inversion") {
            mes.inversiones += monto;
        }
    });

    meses.forEach(mes => {
        mes.flujo =
            mes.ingresos -
            mes.egresos -
            mes.inversiones;
    });

    return meses;
}

function actualizarBalance() {
    const inicial = obtenerBalanceInicial();
    const balance = calcularBalanceActual();
    const recuperacion = calcularRecuperacion();

    currentBalance.textContent = moneda(balance);

    currentBalance.classList.remove(
        "positive",
        "negative"
    );

    if (balance >= 0) {
        currentBalance.classList.add("positive");

        balanceDescription.textContent =
            "El negocio se encuentra por encima del balance inicial.";
    } else {
        currentBalance.classList.add("negative");

        balanceDescription.textContent =
            `${moneda(Math.abs(balance))} por recuperar para alcanzar el punto de equilibrio.`;
    }

    recoveryPercentage.textContent =
        `${recuperacion.porcentaje.toFixed(1)}%`;

    initialInvestment.textContent =
        moneda(Math.abs(inicial));

    recoveredCapital.textContent =
        moneda(recuperacion.recuperado);

    const grados = Math.min(
        360,
        Math.max(
            0,
            recuperacion.porcentaje * 3.6
        )
    );

    const circulo =
        document.querySelector(".recovery-circle");

    if (circulo) {
        circulo.style.background = `
            conic-gradient(
                rgba(22,168,255,.18) 0deg,
                rgba(22,168,255,.18) ${grados}deg,
                rgba(0,0,0,.12) ${grados}deg,
                rgba(0,0,0,.12) 360deg
            )
        `;
    }
}

function actualizarResumenPeriodo() {
    const cantidad = Number(analysisPeriod.value) || 12;

    const periodoActual =
        obtenerPeriodoActual(cantidad);

    const periodoAnterior =
        obtenerPeriodoAnterior(cantidad);

    const actuales = filtrarPeriodo(
        movimientos,
        periodoActual.inicio,
        periodoActual.fin
    );

    const anteriores = filtrarPeriodo(
        movimientos,
        periodoAnterior.inicio,
        periodoAnterior.fin
    );

    const totalActual = calcularTotales(actuales);
    const totalAnterior = calcularTotales(anteriores);

    periodIncome.textContent =
        moneda(totalActual.ingresos);

    periodExpenses.textContent =
        moneda(totalActual.egresos);

    periodInvestments.textContent =
        moneda(totalActual.inversiones);

    periodNetFlow.textContent =
        moneda(totalActual.flujo);

    incomeComparison.textContent =
        textoComparacion(
            totalActual.ingresos,
            totalAnterior.ingresos
        );

    expenseComparison.textContent =
        textoComparacion(
            totalActual.egresos,
            totalAnterior.egresos
        );

    investmentComparison.textContent =
        textoComparacion(
            totalActual.inversiones,
            totalAnterior.inversiones
        );

    if (totalActual.flujo > 0) {
        flowDescription.textContent =
            "El periodo presenta flujo neto positivo.";

        periodNetFlow.style.color = "#42d99b";
    } else if (totalActual.flujo < 0) {
        flowDescription.textContent =
            "Las salidas superan a los ingresos del periodo.";

        periodNetFlow.style.color = "#ff6472";
    } else {
        flowDescription.textContent =
            "El periodo se encuentra en equilibrio.";

        periodNetFlow.style.color = "";
    }

    actualizarSalud(cantidad);
    crearGraficaEvolucion(cantidad);
    crearDistribucionGastos(actuales);
    actualizarRanking(cantidad);
    actualizarInsights(cantidad);
}

function actualizarSalud(cantidad) {
    const meses = obtenerMeses(cantidad);

    const mesesConActividad = meses.filter(
        mes =>
            mes.ingresos > 0 ||
            mes.egresos > 0 ||
            mes.inversiones > 0
    );

    if (!mesesConActividad.length) {
        healthScore.textContent = "--";
        healthLabel.textContent = "Sin datos";
        incomeExpenseRatio.textContent = "--";
        monthlyNetAverage.textContent = moneda(0);
        positiveMonths.textContent = "0";
        negativeMonths.textContent = "0";

        healthRing.style.background = `
            conic-gradient(
                rgba(255,255,255,.055) 0deg,
                rgba(255,255,255,.055) 360deg
            )
        `;

        return;
    }

    const totales = mesesConActividad.reduce(
        (acumulado, mes) => {
            acumulado.ingresos += mes.ingresos;
            acumulado.egresos += mes.egresos;
            acumulado.inversiones += mes.inversiones;
            acumulado.flujo += mes.flujo;

            return acumulado;
        },
        {
            ingresos: 0,
            egresos: 0,
            inversiones: 0,
            flujo: 0
        }
    );

    const positivos = mesesConActividad.filter(
        mes => mes.flujo > 0
    ).length;

    const negativos = mesesConActividad.filter(
        mes => mes.flujo < 0
    ).length;

    const promedio =
        totales.flujo /
        mesesConActividad.length;

    const salidas =
        totales.egresos +
        totales.inversiones;

    let relacion = null;

    if (salidas > 0) {
        relacion =
            totales.ingresos / salidas;
    }

    incomeExpenseRatio.textContent =
        relacion === null
            ? "--"
            : `${relacion.toFixed(2)}x`;

    monthlyNetAverage.textContent =
        moneda(promedio);

    positiveMonths.textContent =
        String(positivos);

    negativeMonths.textContent =
        String(negativos);

    let puntuacion = 50;

    if (promedio > 0) {
        puntuacion += 20;
    } else if (promedio < 0) {
        puntuacion -= 20;
    }

    if (relacion !== null) {
        if (relacion >= 1.5) {
            puntuacion += 20;
        } else if (relacion >= 1) {
            puntuacion += 10;
        } else if (relacion < 0.75) {
            puntuacion -= 15;
        }
    }

    if (positivos > negativos) {
        puntuacion += 10;
    } else if (negativos > positivos) {
        puntuacion -= 10;
    }

    puntuacion = Math.max(
        0,
        Math.min(100, puntuacion)
    );

    healthScore.textContent =
        Math.round(puntuacion);

    if (puntuacion >= 75) {
        healthLabel.textContent =
            "Tendencia sólida";
    } else if (puntuacion >= 55) {
        healthLabel.textContent =
            "Tendencia estable";
    } else if (puntuacion >= 35) {
        healthLabel.textContent =
            "En recuperación";
    } else {
        healthLabel.textContent =
            "Presión financiera";
    }

    const grados =
        puntuacion * 3.6;

    healthRing.style.background = `
        conic-gradient(
            #16a8ff 0deg,
            #16a8ff ${grados}deg,
            rgba(255,255,255,.055) ${grados}deg,
            rgba(255,255,255,.055) 360deg
        )
    `;
}

function crearGraficaEvolucion(cantidad) {
    const canvas = document.getElementById(
        "financialEvolutionChart"
    );

    if (!canvas) {
        return;
    }

    const meses = obtenerMeses(cantidad);

    if (financialEvolutionChart) {
        financialEvolutionChart.destroy();
    }

    financialEvolutionChart = new Chart(
        canvas,
        {
            type: "line",

            data: {
                labels: meses.map(mes =>
                    nombreMes(mes.fecha)
                ),

                datasets: [
                    {
                        label: "Ingresos",
                        data: meses.map(
                            mes => mes.ingresos
                        ),
                        borderColor: "#42d99b",
                        backgroundColor:
                            "rgba(66,217,155,.08)",
                        borderWidth: 2,
                        tension: .35,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: "Egresos",
                        data: meses.map(
                            mes => mes.egresos
                        ),
                        borderColor: "#ff5566",
                        backgroundColor:
                            "rgba(255,85,102,.06)",
                        borderWidth: 2,
                        tension: .35,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: "Inversiones",
                        data: meses.map(
                            mes => mes.inversiones
                        ),
                        borderColor: "#ffad5b",
                        backgroundColor:
                            "rgba(255,173,91,.06)",
                        borderWidth: 2,
                        tension: .35,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor: "#101720",
                        borderColor:
                            "rgba(255,255,255,.06)",
                        borderWidth: 1,

                        callbacks: {
                            label: context =>
                                `${context.dataset.label}: ${moneda(context.raw)}`
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
                            color: "#53606b"
                        }
                    },

                    y: {
                        beginAtZero: true,

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
                                monedaCompacta(valor)
                        }
                    }
                }
            }
        }
    );
}

function crearDistribucionGastos(lista) {
    const categorias = new Map();

    lista.forEach(movimiento => {
        const tipo = normalizarTipo(
            movimiento.tipo
        );

        if (
            tipo !== "egreso" &&
            tipo !== "inversion"
        ) {
            return;
        }

        const categoria =
            movimiento.categoria ||
            (
                tipo === "inversion"
                    ? "Inversiones"
                    : "Otros"
            );

        categorias.set(
            categoria,
            (
                categorias.get(categoria) || 0
            ) + obtenerMonto(movimiento)
        );
    });

    const datos = [...categorias.entries()]
        .map(([nombre, total]) => ({
            nombre,
            total
        }))
        .sort(
            (a, b) => b.total - a.total
        );

    const total = datos.reduce(
        (suma, item) =>
            suma + item.total,
        0
    );

    expenseDistributionTotal.textContent =
        monedaCompacta(total);

    const colores = [
        "#16a8ff",
        "#42d99b",
        "#ffad5b",
        "#a98cff",
        "#ff6472",
        "#35c6c8",
        "#6f8cff",
        "#d881ff"
    ];

    const canvas = document.getElementById(
        "expenseDistributionChart"
    );

    if (expenseDistributionChart) {
        expenseDistributionChart.destroy();
    }

    expenseDistributionChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels:
                    datos.length
                        ? datos.map(
                            item => item.nombre
                        )
                        : ["Sin datos"],

                datasets: [{
                    data:
                        datos.length
                            ? datos.map(
                                item => item.total
                            )
                            : [1],

                    backgroundColor:
                        datos.length
                            ? datos.map(
                                (_, indice) =>
                                    colores[
                                        indice %
                                        colores.length
                                    ]
                            )
                            : [
                                "rgba(255,255,255,.05)"
                            ],

                    borderWidth: 0
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "76%",

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        enabled: datos.length > 0,

                        callbacks: {
                            label: context =>
                                `${context.label}: ${moneda(context.raw)}`
                        }
                    }
                }
            }
        }
    );

    if (!datos.length) {
        expenseCategoryList.innerHTML = `
            <div class="analysis-empty">
                <i data-lucide="pie-chart"></i>
                <strong>Sin salidas registradas</strong>
                <span>
                    Los egresos e inversiones aparecerán aquí.
                </span>
            </div>
        `;

        lucide.createIcons();

        return;
    }

    expenseCategoryList.innerHTML = datos
        .slice(0, 6)
        .map((item, indice) => {
            const porcentaje =
                total > 0
                    ? (
                        item.total /
                        total
                    ) * 100
                    : 0;

            return `
                <div class="expense-category-item">

                    <span
                        class="expense-category-dot"
                        style="background:${
                            colores[
                                indice %
                                colores.length
                            ]
                        }"
                    ></span>

                    <div class="expense-category-info">

                        <strong>
                            ${escapar(item.nombre)}
                        </strong>

                        <span>
                            ${porcentaje.toFixed(1)}%
                        </span>

                    </div>

                    <strong class="expense-category-amount">
                        ${moneda(item.total)}
                    </strong>

                </div>
            `;
        })
        .join("");
}

function montoMensualRecurrente(item) {
    const monto = Math.abs(
        Number(item.monto) || 0
    );

    switch (item.frecuencia) {
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

function actualizarRecurrentes() {
    const activos = recurrentes.filter(
        item =>
            String(item.estado || "activo")
                .toLowerCase() === "activo"
    );

    const mensual = activos.reduce(
        (total, item) =>
            total +
            montoMensualRecurrente(item),
        0
    );

    const anual = mensual * 12;

    monthlyRecurring.textContent =
        moneda(mensual);

    annualRecurring.textContent =
        moneda(anual);

    recurringCount.textContent =
        String(activos.length);

    const meses = obtenerMeses(12);

    const mesesConIngresos = meses.filter(
        mes => mes.ingresos > 0
    );

    const promedioIngresos =
        mesesConIngresos.length
            ? mesesConIngresos.reduce(
                (total, mes) =>
                    total + mes.ingresos,
                0
            ) / mesesConIngresos.length
            : 0;

    const impacto =
        promedioIngresos > 0
            ? (mensual / promedioIngresos) * 100
            : 0;

    recurringIncomeImpact.textContent =
        `${impacto.toFixed(1)}%`;

    recurringImpactBar.style.width =
        `${Math.min(100, impacto)}%`;
}

function actualizarRanking(cantidad) {
    const meses = obtenerMeses(cantidad)
        .filter(
            mes =>
                mes.ingresos > 0 ||
                mes.egresos > 0 ||
                mes.inversiones > 0
        )
        .sort(
            (a, b) =>
                b.flujo - a.flujo
        );

    if (!meses.length) {
        monthRanking.innerHTML = `
            <div class="analysis-empty">
                <i data-lucide="bar-chart-3"></i>

                <strong>
                    Sin información suficiente
                </strong>

                <span>
                    Registra movimientos para generar el análisis.
                </span>
            </div>
        `;

        lucide.createIcons();

        return;
    }

    monthRanking.innerHTML = meses
        .slice(0, 5)
        .map((mes, indice) => {
            let clase = "neutral";

            if (mes.flujo > 0) {
                clase = "positive";
            }

            if (mes.flujo < 0) {
                clase = "negative";
            }

            return `
                <div class="month-ranking-item">

                    <span class="month-ranking-position">
                        ${indice + 1}
                    </span>

                    <div class="month-ranking-info">

                        <strong>
                            ${capitalizar(
                                nombreMes(
                                    mes.fecha,
                                    true
                                )
                            )}
                        </strong>

                        <span>
                            Ingresos ${moneda(mes.ingresos)}
                            · Salidas ${moneda(
                                mes.egresos +
                                mes.inversiones
                            )}
                        </span>

                    </div>

                    <strong
                        class="month-ranking-value ${clase}"
                    >
                        ${
                            mes.flujo > 0
                                ? "+"
                                : ""
                        }${moneda(mes.flujo)}
                    </strong>

                </div>
            `;
        })
        .join("");
}

function crearInsight(tipo, icono, titulo, texto) {
    return `
        <div class="financial-insight ${tipo}">

            <div class="financial-insight-icon">
                <i data-lucide="${icono}"></i>
            </div>

            <div>
                <strong>
                    ${escapar(titulo)}
                </strong>

                <p>
                    ${escapar(texto)}
                </p>
            </div>

        </div>
    `;
}

function actualizarInsights(cantidad) {
    const meses = obtenerMeses(cantidad);

    const activos = meses.filter(
        mes =>
            mes.ingresos > 0 ||
            mes.egresos > 0 ||
            mes.inversiones > 0
    );

    if (!activos.length) {
        financialInsights.innerHTML = `
            <div class="analysis-empty">

                <i data-lucide="scan-line"></i>

                <strong>
                    Esperando información
                </strong>

                <span>
                    Los indicadores aparecerán conforme registres movimientos.
                </span>

            </div>
        `;

        lucide.createIcons();

        return;
    }

    const totalIngresos = activos.reduce(
        (total, mes) =>
            total + mes.ingresos,
        0
    );

    const totalSalidas = activos.reduce(
        (total, mes) =>
            total +
            mes.egresos +
            mes.inversiones,
        0
    );

    const flujo = totalIngresos - totalSalidas;

    const promedioIngresos =
        totalIngresos /
        activos.length;

    const promedioSalidas =
        totalSalidas /
        activos.length;

    const positivos = activos.filter(
        mes => mes.flujo > 0
    ).length;

    const negativos = activos.filter(
        mes => mes.flujo < 0
    ).length;

    const recurrentesActivos =
        recurrentes.filter(
            item =>
                String(
                    item.estado || "activo"
                ).toLowerCase() === "activo"
        );

    const recurrenteMensual =
        recurrentesActivos.reduce(
            (total, item) =>
                total +
                montoMensualRecurrente(item),
            0
        );

    const insights = [];

    if (flujo > 0) {
        insights.push(
            crearInsight(
                "positive",
                "trending-up",
                "Flujo favorable",
                `En el periodo analizado los ingresos superan las salidas por ${moneda(flujo)}.`
            )
        );
    } else if (flujo < 0) {
        insights.push(
            crearInsight(
                "negative",
                "trending-down",
                "Flujo bajo presión",
                `En el periodo analizado las salidas superan los ingresos por ${moneda(Math.abs(flujo))}.`
            )
        );
    } else {
        insights.push(
            crearInsight(
                "info",
                "minus",
                "Flujo equilibrado",
                "Los ingresos y las salidas del periodo tienen el mismo valor."
            )
        );
    }

    if (positivos > negativos) {
        insights.push(
            crearInsight(
                "positive",
                "calendar-check",
                "Mayoría de meses positivos",
                `${positivos} meses presentan flujo positivo frente a ${negativos} con flujo negativo.`
            )
        );
    } else if (negativos > positivos) {
        insights.push(
            crearInsight(
                "warning",
                "calendar-clock",
                "Meses negativos predominantes",
                `${negativos} meses presentan flujo negativo frente a ${positivos} positivos.`
            )
        );
    }

    if (promedioIngresos > 0) {
        const porcentaje =
            (
                recurrenteMensual /
                promedioIngresos
            ) * 100;

        if (porcentaje >= 70) {
            insights.push(
                crearInsight(
                    "negative",
                    "repeat-2",
                    "Carga recurrente elevada",
                    `Los compromisos recurrentes equivalen aproximadamente al ${porcentaje.toFixed(1)}% del ingreso mensual promedio registrado.`
                )
            );
        } else if (porcentaje >= 40) {
            insights.push(
                crearInsight(
                    "warning",
                    "repeat-2",
                    "Carga recurrente relevante",
                    `Los compromisos recurrentes representan aproximadamente el ${porcentaje.toFixed(1)}% del ingreso mensual promedio.`
                )
            );
        } else {
            insights.push(
                crearInsight(
                    "info",
                    "repeat-2",
                    "Compromisos recurrentes",
                    `Los gastos recurrentes representan aproximadamente el ${porcentaje.toFixed(1)}% del ingreso mensual promedio.`
                )
            );
        }
    }

    if (promedioSalidas > promedioIngresos) {
        insights.push(
            crearInsight(
                "warning",
                "scale",
                "Promedio mensual desfavorable",
                `Las salidas mensuales promedio son ${moneda(promedioSalidas)}, frente a ingresos promedio de ${moneda(promedioIngresos)}.`
            )
        );
    }

    const recuperacion = calcularRecuperacion();

    insights.push(
        crearInsight(
            "info",
            "target",
            "Recuperación de inversión",
            `PMC ha recuperado ${recuperacion.porcentaje.toFixed(1)}% de la base inicial registrada.`
        )
    );

    financialInsights.innerHTML =
        insights
            .slice(0, 4)
            .join("");

    lucide.createIcons();
}

function actualizarAnalisis() {
    actualizarBalance();
    actualizarResumenPeriodo();
    actualizarRecurrentes();

    lucide.createIcons();
}

analysisPeriod?.addEventListener(
    "change",
    actualizarAnalisis
);

async function iniciar() {
    await Promise.all([
        cargarMovimientos(),
        cargarRecurrentes(),
        cargarConfiguracion()
    ]);

    actualizarAnalisis();
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
                await obtenerUsuario(usuario);

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

            await iniciar();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error cargando análisis financiero:",
                error
            );

            securityLoader.innerHTML = `
                <div class="security-loader-content">
                    <span>
                        No fue posible cargar el análisis financiero.
                    </span>
                </div>
            `;
        }
    }
);