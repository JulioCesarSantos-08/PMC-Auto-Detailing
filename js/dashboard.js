import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    orderBy,
    limit
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

const welcomeDate = document.getElementById("welcomeDate");

const newMovementButton = document.getElementById("newMovementButton");
const emptyMovementButton = document.getElementById("emptyMovementButton");

const movementModal = document.getElementById("movementModal");
const movementModalClose = document.getElementById("movementModalClose");
const movementModalAccept = document.getElementById("movementModalAccept");
const modalBackdrop = movementModal?.querySelector(".modal-backdrop");

const currentBalance = document.getElementById("currentBalance");
const balanceStatus = document.getElementById("balanceStatus");

const recoveryPercentage = document.getElementById("recoveryPercentage");
const recoveryProgress = document.getElementById("recoveryProgress");

const initialBalance = document.getElementById("initialBalance");
const recoveredAmount = document.getElementById("recoveredAmount");

const monthlyIncome = document.getElementById("monthlyIncome");
const monthlyExpenses = document.getElementById("monthlyExpenses");
const monthlyNetFlow = document.getElementById("monthlyNetFlow");

const netFlowStatus = document.getElementById("netFlowStatus");
const breakEvenTime = document.getElementById("breakEvenTime");

const averageNetFlow = document.getElementById("averageNetFlow");
const amountToRecover = document.getElementById("amountToRecover");
const estimatedDate = document.getElementById("estimatedDate");

const expensesChartTotal = document.getElementById("expensesChartTotal");
const recentMovements = document.getElementById("recentMovements");
const expenseCategories = document.getElementById("expenseCategories");

let balanceChart = null;
let expensesChart = null;

let configuracionFinanciera = null;
let movimientos = [];

function redirigirLogin() {
    window.location.replace("index.html");
}

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");
    document.body.style.overflow = "";

    if (window.lucide) {
        lucide.createIcons();
    }
}

function obtenerIniciales(nombre) {
    if (!nombre) {
        return "P";
    }

    const palabras = nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (palabras.length === 1) {
        return palabras[0].charAt(0).toUpperCase();
    }

    return (
        palabras[0].charAt(0) +
        palabras[1].charAt(0)
    ).toUpperCase();
}

function cargarUsuario(datos, usuario) {
    const nombre =
        datos?.nombre ||
        usuario?.displayName ||
        usuario?.email?.split("@")[0] ||
        "Usuario";

    const iniciales = obtenerIniciales(nombre);

    sidebarUserName.textContent = nombre;
    topbarUserName.textContent = nombre;

    sidebarAvatar.textContent = iniciales;
    topbarAvatar.textContent = iniciales;
}

function cargarFecha() {
    const fecha = new Date();

    const texto = new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(fecha);

    welcomeDate.textContent = texto.toUpperCase();
}

async function obtenerDatosUsuario(usuario) {
    const referencia = doc(
        db,
        "usuarios",
        usuario.uid
    );

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}

function tienePermisoFinanzas(datos) {
    return datos?.permisos?.finanzas === true;
}

async function obtenerConfiguracionFinanciera() {
    const referencia = doc(
        db,
        "finanzas",
        "configuracion"
    );

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}

async function obtenerMovimientos() {
    try {
        const referencia = collection(
            db,
            "finanzas",
            "movimientos",
            "registros"
        );

        const snapshot = await getDocs(referencia);

        return snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));

    } catch (error) {
        console.error(
            "Error obteniendo movimientos:",
            error
        );

        return [];
    }
}

function normalizarTipo(tipo) {
    return String(tipo || "")
        .trim()
        .toLowerCase();
}

function obtenerMontoMovimiento(movimiento) {
    return Math.abs(
        Number(movimiento?.monto) || 0
    );
}

function obtenerFechaMovimiento(movimiento) {
    if (movimiento?.fecha?.toDate) {
        return movimiento.fecha.toDate();
    }

    if (movimiento?.fecha instanceof Date) {
        return movimiento.fecha;
    }

    if (typeof movimiento?.fecha === "string") {
        const fecha = new Date(
            `${movimiento.fecha}T12:00:00`
        );

        if (!Number.isNaN(fecha.getTime())) {
            return fecha;
        }
    }

    if (movimiento?.creadoEn?.toDate) {
        return movimiento.creadoEn.toDate();
    }

    return null;
}

function movimientoAfectaBalance(movimiento) {
    return movimiento?.estado !== "cancelado";
}

function calcularDatosFinancieros() {
    const inversionInicial = Math.abs(
        Number(
            configuracionFinanciera?.inversionInicial ||
            configuracionFinanciera?.balanceInicial ||
            0
        )
    );

    const balanceInicial = -inversionInicial;

    let totalIngresos = 0;
    let totalEgresos = 0;

    let ingresosMes = 0;
    let egresosMes = 0;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    movimientos.forEach((movimiento) => {
        if (!movimientoAfectaBalance(movimiento)) {
            return;
        }

        const tipo = normalizarTipo(movimiento.tipo);
        const monto = obtenerMontoMovimiento(movimiento);
        const fecha = obtenerFechaMovimiento(movimiento);

        const perteneceMesActual =
            fecha &&
            fecha.getMonth() === mesActual &&
            fecha.getFullYear() === anioActual;

        if (tipo === "ingreso") {
            totalIngresos += monto;

            if (perteneceMesActual) {
                ingresosMes += monto;
            }

            return;
        }

        if (
            tipo === "egreso" ||
            tipo === "inversion"
        ) {
            totalEgresos += monto;

            if (perteneceMesActual) {
                egresosMes += monto;
            }
        }
    });

    const balanceActual =
        balanceInicial +
        totalIngresos -
        totalEgresos;

    const recuperadoBruto =
        balanceActual - balanceInicial;

    const recuperado = Math.max(
        0,
        Math.min(
            inversionInicial,
            recuperadoBruto
        )
    );

    const porcentajeRecuperacion =
        inversionInicial > 0
            ? Math.max(
                0,
                Math.min(
                    100,
                    (
                        recuperado /
                        inversionInicial
                    ) * 100
                )
            )
            : 0;

    const porRecuperar = Math.max(
        0,
        -balanceActual
    );

    const flujoNetoMes =
        ingresosMes - egresosMes;

    return {
        inversionInicial,
        balanceInicial,
        totalIngresos,
        totalEgresos,
        balanceActual,
        recuperado,
        porcentajeRecuperacion,
        porRecuperar,
        ingresosMes,
        egresosMes,
        flujoNetoMes
    };
}

function actualizarDashboard(datos) {
    currentBalance.textContent =
        formatearMoneda(datos.balanceActual);

    currentBalance.classList.remove(
        "negative",
        "positive"
    );

    if (datos.balanceActual >= 0) {
        currentBalance.classList.add("positive");

        balanceStatus.innerHTML = `
            <i data-lucide="circle-check"></i>
            <span>PMC alcanzó el punto de equilibrio</span>
        `;
    } else {
        currentBalance.classList.add("negative");

        balanceStatus.innerHTML = `
            <i data-lucide="trending-up"></i>
            <span>
                ${formatearMoneda(datos.porRecuperar)}
                por recuperar
            </span>
        `;
    }

    recoveryPercentage.textContent =
        `${formatearPorcentaje(
            datos.porcentajeRecuperacion
        )}%`;

    recoveryProgress.style.width =
        `${datos.porcentajeRecuperacion}%`;

    initialBalance.textContent =
        formatearMoneda(datos.balanceInicial);

    recoveredAmount.textContent =
        formatearMoneda(datos.recuperado);

    monthlyIncome.textContent =
        formatearMoneda(datos.ingresosMes);

    monthlyExpenses.textContent =
        formatearMoneda(datos.egresosMes);

    monthlyNetFlow.textContent =
        formatearMoneda(datos.flujoNetoMes);

    actualizarEstadoFlujo(datos.flujoNetoMes);

    actualizarAnilloRecuperacion(
        datos.porcentajeRecuperacion
    );

    amountToRecover.textContent =
        formatearMoneda(datos.porRecuperar);

    actualizarProyeccion(datos);

    if (window.lucide) {
        lucide.createIcons();
    }
}

function actualizarEstadoFlujo(flujo) {
    if (!netFlowStatus) {
        return;
    }

    netFlowStatus.classList.remove(
        "neutral",
        "positive",
        "negative"
    );

    if (flujo > 0) {
        netFlowStatus.classList.add("positive");

        netFlowStatus.innerHTML = `
            <i data-lucide="trending-up"></i>
            <span>Flujo positivo este mes</span>
        `;

        return;
    }

    if (flujo < 0) {
        netFlowStatus.classList.add("negative");

        netFlowStatus.innerHTML = `
            <i data-lucide="trending-down"></i>
            <span>Flujo negativo este mes</span>
        `;

        return;
    }

    netFlowStatus.classList.add("neutral");

    netFlowStatus.innerHTML = `
        <i data-lucide="minus"></i>
        <span>Sin movimiento neto</span>
    `;
}

function calcularPromedioMensual() {
    if (!movimientos.length) {
        return 0;
    }

    const grupos = new Map();

    movimientos.forEach((movimiento) => {
        if (!movimientoAfectaBalance(movimiento)) {
            return;
        }

        const fecha = obtenerFechaMovimiento(movimiento);

        if (!fecha) {
            return;
        }

        const clave =
            `${fecha.getFullYear()}-${fecha.getMonth()}`;

        if (!grupos.has(clave)) {
            grupos.set(clave, {
                ingresos: 0,
                egresos: 0
            });
        }

        const grupo = grupos.get(clave);
        const monto = obtenerMontoMovimiento(movimiento);
        const tipo = normalizarTipo(movimiento.tipo);

        if (tipo === "ingreso") {
            grupo.ingresos += monto;
        }

        if (
            tipo === "egreso" ||
            tipo === "inversion"
        ) {
            grupo.egresos += monto;
        }
    });

    if (!grupos.size) {
        return 0;
    }

    let sumaFlujos = 0;

    grupos.forEach((grupo) => {
        sumaFlujos +=
            grupo.ingresos -
            grupo.egresos;
    });

    return sumaFlujos / grupos.size;
}

function actualizarProyeccion(datos) {
    const promedio = calcularPromedioMensual();

    averageNetFlow.textContent =
        formatearMoneda(promedio);

    if (
        datos.balanceActual >= 0
    ) {
        breakEvenTime.textContent =
            "Alcanzado";

        estimatedDate.textContent =
            "Equilibrio alcanzado";

        return;
    }

    if (promedio <= 0) {
        breakEvenTime.textContent =
            "--";

        estimatedDate.textContent =
            "Sin estimación";

        return;
    }

    const mesesNecesarios =
        datos.porRecuperar / promedio;

    const mesesRedondeados =
        Math.ceil(mesesNecesarios);

    if (mesesRedondeados === 1) {
        breakEvenTime.textContent =
            "≈ 1 mes";
    } else {
        breakEvenTime.textContent =
            `≈ ${mesesRedondeados} meses`;
    }

    const fechaEstimada = new Date();

    fechaEstimada.setMonth(
        fechaEstimada.getMonth() +
        mesesRedondeados
    );

    estimatedDate.textContent =
        new Intl.DateTimeFormat(
            "es-MX",
            {
                month: "long",
                year: "numeric"
            }
        ).format(fechaEstimada);
}

function ordenarMovimientosPorFecha(lista) {
    return [...lista].sort((a, b) => {
        const fechaA =
            obtenerFechaMovimiento(a)?.getTime() || 0;

        const fechaB =
            obtenerFechaMovimiento(b)?.getTime() || 0;

        return fechaB - fechaA;
    });
}

function mostrarMovimientosRecientes() {
    if (!recentMovements) {
        return;
    }

    const lista =
        ordenarMovimientosPorFecha(
            movimientos.filter(
                movimientoAfectaBalance
            )
        ).slice(0, 5);

    if (!lista.length) {
        recentMovements.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">
                    <i data-lucide="receipt-text"></i>
                </div>

                <strong>Sin movimientos</strong>

                <p>
                    Los ingresos y egresos recientes
                    aparecerán aquí.
                </p>

                <button
                    type="button"
                    id="emptyMovementButtonDynamic"
                >
                    Registrar movimiento
                </button>

            </div>
        `;

        document
            .getElementById(
                "emptyMovementButtonDynamic"
            )
            ?.addEventListener(
                "click",
                abrirModalMovimiento
            );

        return;
    }

    recentMovements.innerHTML =
        lista.map((movimiento) => {
            const tipo =
                normalizarTipo(movimiento.tipo);

            const esIngreso =
                tipo === "ingreso";

            const monto =
                obtenerMontoMovimiento(movimiento);

            const fecha =
                obtenerFechaMovimiento(movimiento);

            const titulo =
                escaparHTML(
                    movimiento.concepto ||
                    movimiento.descripcion ||
                    capitalizar(tipo)
                );

            const fechaTexto = fecha
                ? new Intl.DateTimeFormat(
                    "es-MX",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                ).format(fecha)
                : "Sin fecha";

            return `
                <div class="recent-movement-item">

                    <div class="recent-movement-icon ${esIngreso ? "income" : "expense"}">
                        <i data-lucide="${esIngreso ? "arrow-up-right" : "arrow-down-right"}"></i>
                    </div>

                    <div class="recent-movement-info">
                        <strong>${titulo}</strong>
                        <span>${fechaTexto}</span>
                    </div>

                    <strong class="recent-movement-amount ${esIngreso ? "income" : "expense"}">
                        ${esIngreso ? "+" : "-"}${formatearMoneda(monto)}
                    </strong>

                </div>
            `;
        }).join("");

    if (window.lucide) {
        lucide.createIcons();
    }
}

function obtenerCategoriasEgresos() {
    const categorias = new Map();

    movimientos.forEach((movimiento) => {
        if (!movimientoAfectaBalance(movimiento)) {
            return;
        }

        const tipo = normalizarTipo(movimiento.tipo);

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

        const monto =
            obtenerMontoMovimiento(movimiento);

        categorias.set(
            categoria,
            (categorias.get(categoria) || 0) +
            monto
        );
    });

    return [...categorias.entries()]
        .map(([nombre, total]) => ({
            nombre,
            total
        }))
        .sort(
            (a, b) =>
                b.total - a.total
        );
}

function actualizarGraficaEgresos() {
    const categorias =
        obtenerCategoriasEgresos();

    const total =
        categorias.reduce(
            (suma, item) =>
                suma + item.total,
            0
        );

    expensesChartTotal.textContent =
        formatearMonedaCompacta(total);

    if (!categorias.length) {
        crearGraficaEgresos();

        expenseCategories.innerHTML = `
            <div class="distribution-empty">
                Aún no hay egresos registrados.
            </div>
        `;

        return;
    }

    if (expensesChart) {
        expensesChart.destroy();
    }

    const canvas =
        document.getElementById(
            "expensesChart"
        );

    const colores = [
        "#16a8ff",
        "#42d99b",
        "#ffad5b",
        "#a98cff",
        "#ff6472",
        "#5f7cff",
        "#35c6c8"
    ];

    expensesChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels:
                    categorias.map(
                        item => item.nombre
                    ),

                datasets: [
                    {
                        data:
                            categorias.map(
                                item => item.total
                            ),
                        backgroundColor:
                            categorias.map(
                                (_, index) =>
                                    colores[
                                        index %
                                        colores.length
                                    ]
                            ),
                        borderWidth: 0,
                        hoverOffset: 4
                    }
                ]
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
                        backgroundColor:
                            "#101720",

                        displayColors: false,

                        callbacks: {
                            label: (context) =>
                                formatearMoneda(
                                    context.raw
                                )
                        }
                    }
                }
            }
        }
    );

    expenseCategories.innerHTML =
        categorias
            .slice(0, 5)
            .map((item, index) => {
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
                            style="background:${colores[index % colores.length]}"
                        ></span>

                        <div>
                            <strong>
                                ${escaparHTML(item.nombre)}
                            </strong>

                            <span>
                                ${formatearPorcentaje(porcentaje)}%
                            </span>
                        </div>

                        <strong>
                            ${formatearMoneda(item.total)}
                        </strong>

                    </div>
                `;
            })
            .join("");
}

function obtenerBalancePorMes() {
    const meses = [];

    const hoy = new Date();

    const inversionInicial =
        Math.abs(
            Number(
                configuracionFinanciera
                    ?.inversionInicial || 0
            )
        );

    let balance = -inversionInicial;

    const movimientosOrdenados =
        [...movimientos]
            .filter(movimientoAfectaBalance)
            .sort((a, b) => {
                const fechaA =
                    obtenerFechaMovimiento(a)?.getTime() || 0;

                const fechaB =
                    obtenerFechaMovimiento(b)?.getTime() || 0;

                return fechaA - fechaB;
            });

    for (let i = 11; i >= 0; i--) {
        const fechaMes = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - i,
            1
        );

        const ultimoDia = new Date(
            fechaMes.getFullYear(),
            fechaMes.getMonth() + 1,
            0,
            23,
            59,
            59
        );

        balance = -inversionInicial;

        movimientosOrdenados.forEach(
            movimiento => {
                const fecha =
                    obtenerFechaMovimiento(
                        movimiento
                    );

                if (
                    !fecha ||
                    fecha > ultimoDia
                ) {
                    return;
                }

                const tipo =
                    normalizarTipo(
                        movimiento.tipo
                    );

                const monto =
                    obtenerMontoMovimiento(
                        movimiento
                    );

                if (tipo === "ingreso") {
                    balance += monto;
                }

                if (
                    tipo === "egreso" ||
                    tipo === "inversion"
                ) {
                    balance -= monto;
                }
            }
        );

        meses.push({
            etiqueta:
                new Intl.DateTimeFormat(
                    "es-MX",
                    {
                        month: "short"
                    }
                ).format(fechaMes),

            balance
        });
    }

    return meses;
}

function crearGraficaBalance() {
    const canvas =
        document.getElementById(
            "balanceChart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    if (balanceChart) {
        balanceChart.destroy();
    }

    const datos =
        obtenerBalancePorMes();

    const contexto =
        canvas.getContext("2d");

    const gradiente =
        contexto.createLinearGradient(
            0,
            0,
            0,
            280
        );

    gradiente.addColorStop(
        0,
        "rgba(22,168,255,0.22)"
    );

    gradiente.addColorStop(
        1,
        "rgba(22,168,255,0)"
    );

    balanceChart =
        new Chart(
            contexto,
            {
                type: "line",

                data: {
                    labels:
                        datos.map(
                            item =>
                                item.etiqueta
                        ),

                    datasets: [
                        {
                            data:
                                datos.map(
                                    item =>
                                        item.balance
                                ),

                            borderColor:
                                "#16a8ff",

                            backgroundColor:
                                gradiente,

                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            fill: true,
                            tension: 0.35
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            backgroundColor:
                                "#101720",

                            displayColors:
                                false,

                            callbacks: {
                                label:
                                    context =>
                                        formatearMoneda(
                                            context.raw
                                        )
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
                                color:
                                    "#56636f",

                                font: {
                                    size: 10
                                }
                            }
                        },

                        y: {
                            border: {
                                display: false
                            },

                            grid: {
                                color:
                                    "rgba(255,255,255,0.045)"
                            },

                            ticks: {
                                color:
                                    "#56636f",

                                callback:
                                    value =>
                                        formatearMonedaCompacta(
                                            value
                                        )
                            }
                        }
                    }
                }
            }
        );
}

function crearGraficaEgresos() {
    const canvas =
        document.getElementById(
            "expensesChart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    if (expensesChart) {
        expensesChart.destroy();
    }

    expensesChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels: [
                        "Sin registros"
                    ],

                    datasets: [
                        {
                            data: [1],

                            backgroundColor: [
                                "rgba(255,255,255,0.055)"
                            ],

                            borderWidth: 0,
                            hoverOffset: 0
                        }
                    ]
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
                            enabled: false
                        }
                    }
                }
            }
        );
}

function actualizarAnilloRecuperacion(
    porcentaje
) {
    const ring =
        document.getElementById(
            "projectionRing"
        );

    const texto =
        document.getElementById(
            "ringPercentage"
        );

    const valor = Math.max(
        0,
        Math.min(
            100,
            Number(porcentaje) || 0
        )
    );

    const circunferencia = 326.73;

    const offset =
        circunferencia -
        (
            valor / 100
        ) *
        circunferencia;

    if (ring) {
        ring.style.strokeDashoffset =
            offset;
    }

    if (texto) {
        texto.textContent =
            `${formatearPorcentaje(valor)}%`;
    }
}

function inicializarGraficas() {
    crearGraficaBalance();
    actualizarGraficaEgresos();
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        Number(valor) || 0
    );
}

function formatearMonedaCompacta(valor) {
    const numero =
        Number(valor) || 0;

    const absoluto =
        Math.abs(numero);

    if (absoluto >= 1000000) {
        return `$${(
            numero / 1000000
        ).toFixed(1)}M`;
    }

    if (absoluto >= 1000) {
        return `$${(
            numero / 1000
        ).toFixed(0)}k`;
    }

    return `$${numero.toFixed(0)}`;
}

function formatearPorcentaje(valor) {
    const numero =
        Number(valor) || 0;

    if (
        Math.abs(
            numero -
            Math.round(numero)
        ) < 0.05
    ) {
        return Math.round(numero);
    }

    return numero.toFixed(1);
}

function capitalizar(texto) {
    const valor =
        String(texto || "");

    if (!valor) {
        return "";
    }

    return (
        valor.charAt(0).toUpperCase() +
        valor.slice(1)
    );
}

function escaparHTML(texto) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(texto || "");

    return elemento.innerHTML;
}

function abrirSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");

    if (window.innerWidth <= 900) {
        document.body.style.overflow =
            "hidden";
    }
}

function cerrarSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

mobileMenu?.addEventListener(
    "click",
    abrirSidebar
);

sidebarClose?.addEventListener(
    "click",
    cerrarSidebar
);

sidebarOverlay?.addEventListener(
    "click",
    cerrarSidebar
);

window.addEventListener(
    "resize",
    () => {
        if (window.innerWidth > 900) {
            cerrarSidebar();
        }
    }
);

logoutButton?.addEventListener(
    "click",
    async () => {
        logoutButton.disabled = true;

        try {
            await signOut(auth);
            redirigirLogin();
        } catch (error) {
            console.error(error);
            logoutButton.disabled = false;
        }
    }
);

function abrirModalMovimiento() {
    if (!movementModal) {
        return;
    }

    movementModal.classList.add("active");
    movementModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    if (window.lucide) {
        lucide.createIcons();
    }
}

function cerrarModalMovimiento() {
    if (!movementModal) {
        return;
    }

    movementModal.classList.remove(
        "active"
    );

    movementModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";
}

newMovementButton?.addEventListener(
    "click",
    abrirModalMovimiento
);

emptyMovementButton?.addEventListener(
    "click",
    abrirModalMovimiento
);

movementModalClose?.addEventListener(
    "click",
    cerrarModalMovimiento
);

movementModalAccept?.addEventListener(
    "click",
    cerrarModalMovimiento
);

modalBackdrop?.addEventListener(
    "click",
    cerrarModalMovimiento
);

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape" &&
            movementModal?.classList.contains(
                "active"
            )
        ) {
            cerrarModalMovimiento();
        }
    }
);

async function cargarSistema() {
    configuracionFinanciera =
        await obtenerConfiguracionFinanciera();

    movimientos =
        await obtenerMovimientos();

    if (!configuracionFinanciera) {
        currentBalance.textContent =
            "$0.00";

        balanceStatus.innerHTML = `
            <i data-lucide="settings"></i>
            <span>
                Configura la inversión inicial
            </span>
        `;

        inicializarGraficas();
        mostrarMovimientosRecientes();

        return;
    }

    const datos =
        calcularDatosFinancieros();

    actualizarDashboard(datos);

    inicializarGraficas();

    mostrarMovimientosRecientes();
}

async function verificarAcceso(usuario) {
    if (!usuario) {
        redirigirLogin();
        return;
    }

    try {
        const datos =
            await obtenerDatosUsuario(
                usuario
            );

        if (
            !datos ||
            !tienePermisoFinanzas(datos)
        ) {
            await signOut(auth);
            redirigirLogin();
            return;
        }

        cargarUsuario(
            datos,
            usuario
        );

        cargarFecha();

        await cargarSistema();

        mostrarAplicacion();

    } catch (error) {
        console.error(
            "Error cargando PMC Finanzas:",
            error
        );

        try {
            await signOut(auth);
        } catch (signOutError) {
            console.error(signOutError);
        }

        redirigirLogin();
    }
}

onAuthStateChanged(
    auth,
    async usuario => {
        await verificarAcceso(usuario);
    }
);