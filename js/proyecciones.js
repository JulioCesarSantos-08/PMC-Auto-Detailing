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

const projectionHorizon = document.getElementById("projectionHorizon");

const projectionCurrentBalance = document.getElementById("projectionCurrentBalance");
const projectionBalanceText = document.getElementById("projectionBalanceText");

const averageMonthlyFlow = document.getElementById("averageMonthlyFlow");
const averageFlowStatus = document.getElementById("averageFlowStatus");

const estimatedBreakEven = document.getElementById("estimatedBreakEven");
const breakEvenStatus = document.getElementById("breakEvenStatus");

const amountToRecover = document.getElementById("amountToRecover");
const averageMonthlyIncome = document.getElementById("averageMonthlyIncome");
const averageMonthlyExpenses = document.getElementById("averageMonthlyExpenses");
const projectionRecurring = document.getElementById("projectionRecurring");

const projectionRecoveryRing = document.getElementById("projectionRecoveryRing");
const projectionRecoveryPercent = document.getElementById("projectionRecoveryPercent");
const projectionInitialBalance = document.getElementById("projectionInitialBalance");
const projectionRecovered = document.getElementById("projectionRecovered");
const projectionPending = document.getElementById("projectionPending");

const conservativeFlow = document.getElementById("conservativeFlow");
const currentFlowScenario = document.getElementById("currentFlowScenario");
const growthFlow = document.getElementById("growthFlow");

const conservativeBreakEven = document.getElementById("conservativeBreakEven");
const currentBreakEven = document.getElementById("currentBreakEven");
const growthBreakEven = document.getElementById("growthBreakEven");

const projectionTableBody = document.getElementById("projectionTableBody");
const projectionInsights = document.getElementById("projectionInsights");

let movimientos = [];
let recurrentes = [];
let configuracion = {};

let projectionChart = null;

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
    const numero = Number(valor) || 0;
    const absoluto = Math.abs(numero);

    let texto = "";

    if (absoluto >= 1000000) {
        texto = `$${(absoluto / 1000000).toFixed(1)}M`;
    } else if (absoluto >= 1000) {
        texto = `$${(absoluto / 1000).toFixed(1)}k`;
    } else {
        texto = `$${absoluto.toFixed(0)}`;
    }

    return numero < 0
        ? `-${texto}`
        : texto;
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
    return convertirFecha(
        movimiento.fecha ??
        movimiento.fechaMovimiento ??
        movimiento.creadoEn ??
        movimiento.createdAt ??
        null
    );
}

function claveMes(fecha) {
    return `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
    ).padStart(2, "0")}`;
}

function nombreMes(fecha, incluirAnio = false) {
    return new Intl.DateTimeFormat(
        "es-MX",
        {
            month: "short",
            year: incluirAnio ? "numeric" : undefined
        }
    ).format(fecha);
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

function capitalizar(texto) {
    const valor = String(texto || "");

    if (!valor) {
        return "";
    }

    return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function sumarMeses(fecha, cantidad) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth() + cantidad,
        1
    );
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
                "Configuración no encontrada:",
                ruta.join("/")
            );
        }
    }
}

function obtenerBalanceInicial() {
    const valores = [
        configuracion.balanceInicial,
        configuracion.inversionInicial,
        configuracion.capitalInicial,
        configuracion.saldoInicial,
        configuracion.balance_inicial
    ];

    for (const valor of valores) {
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

function calcularTotales(lista) {
    let ingresos = 0;
    let egresos = 0;
    let inversiones = 0;

    lista.forEach(movimiento => {
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
            pendiente: Math.max(0, -actual),
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

    const pendiente = Math.max(
        0,
        -actual
    );

    const porcentaje =
        base > 0
            ? (recuperado / base) * 100
            : 0;

    return {
        base,
        recuperado,
        pendiente,
        porcentaje
    };
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
            flujo: 0,
            actividad: false
        });
    }

    movimientos.forEach(movimiento => {
        const fecha =
            obtenerFechaMovimiento(movimiento);

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

        const tipo =
            normalizarTipo(movimiento.tipo);

        const monto =
            obtenerMonto(movimiento);

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

    meses.forEach(mes => {
        mes.flujo =
            mes.ingresos -
            mes.egresos -
            mes.inversiones;
    });

    return meses;
}

function montoMensualRecurrente(item) {
    const monto = Math.abs(
        Number(item.monto) || 0
    );

    const frecuencia = String(
        item.frecuencia || "mensual"
    ).toLowerCase();

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

function obtenerRecurrenteMensual() {
    return recurrentes
        .filter(
            item =>
                String(
                    item.estado || "activo"
                ).toLowerCase() === "activo"
        )
        .reduce(
            (total, item) =>
                total +
                montoMensualRecurrente(item),
            0
        );
}

function calcularPromedios() {
    const meses = obtenerMesesHistoricos(12);

    const activos = meses.filter(
        mes => mes.actividad
    );

    if (!activos.length) {
        return {
            mesesActivos: 0,
            ingreso: 0,
            egreso: 0,
            inversion: 0,
            salida: 0,
            flujoHistorico: 0,
            recurrente: obtenerRecurrenteMensual(),
            flujoProyectado: 0
        };
    }

    const totales = activos.reduce(
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

    const cantidad = activos.length;

    const ingreso =
        totales.ingresos / cantidad;

    const egreso =
        totales.egresos / cantidad;

    const inversion =
        totales.inversiones / cantidad;

    const salida =
        egreso + inversion;

    const flujoHistorico =
        ingreso - salida;

    const recurrente =
        obtenerRecurrenteMensual();

    const flujoProyectado =
        flujoHistorico - recurrente;

    return {
        mesesActivos: cantidad,
        ingreso,
        egreso,
        inversion,
        salida,
        flujoHistorico,
        recurrente,
        flujoProyectado
    };
}

function mesesParaEquilibrio(
    balance,
    flujoMensual
) {
    if (balance >= 0) {
        return 0;
    }

    if (flujoMensual <= 0) {
        return null;
    }

    return Math.ceil(
        Math.abs(balance) / flujoMensual
    );
}

function fechaEquilibrio(
    balance,
    flujoMensual
) {
    const meses = mesesParaEquilibrio(
        balance,
        flujoMensual
    );

    if (meses === null) {
        return null;
    }

    if (meses === 0) {
        return new Date();
    }

    return sumarMeses(
        new Date(),
        meses
    );
}

function textoEquilibrio(
    balance,
    flujoMensual
) {
    if (balance >= 0) {
        return "Equilibrio alcanzado";
    }

    const meses = mesesParaEquilibrio(
        balance,
        flujoMensual
    );

    if (meses === null) {
        return "Sin estimación";
    }

    if (meses === 1) {
        return "≈ 1 mes";
    }

    return `≈ ${meses} meses`;
}

function generarProyeccion(
    balanceInicial,
    flujoMensual,
    horizonte
) {
    const resultado = [];
    let balance = balanceInicial;

    for (
        let indice = 1;
        indice <= horizonte;
        indice++
    ) {
        const fecha = sumarMeses(
            new Date(),
            indice
        );

        balance += flujoMensual;

        resultado.push({
            numero: indice,
            fecha,
            flujo: flujoMensual,
            balance
        });
    }

    return resultado;
}

function actualizarCabecera() {
    const balance = calcularBalanceActual();
    const recuperacion = calcularRecuperacion();
    const promedios = calcularPromedios();

    projectionCurrentBalance.textContent =
        moneda(balance);

    projectionCurrentBalance.classList.remove(
        "positive"
    );

    if (balance >= 0) {
        projectionCurrentBalance.classList.add(
            "positive"
        );

        projectionBalanceText.textContent =
            "PMC se encuentra por encima del punto de equilibrio.";
    } else {
        projectionBalanceText.textContent =
            `${moneda(Math.abs(balance))} pendientes para alcanzar el equilibrio.`;
    }

    averageMonthlyFlow.textContent =
        moneda(promedios.flujoProyectado);

    if (promedios.flujoProyectado > 0) {
        averageMonthlyFlow.style.color =
            "#42d99b";

        averageFlowStatus.textContent =
            "Tendencia mensual favorable";
    } else if (promedios.flujoProyectado < 0) {
        averageMonthlyFlow.style.color =
            "#ff6472";

        averageFlowStatus.textContent =
            "La tendencia actual incrementa el capital por recuperar";
    } else {
        averageMonthlyFlow.style.color = "";

        averageFlowStatus.textContent =
            "Sin variación mensual estimada";
    }

    estimatedBreakEven.textContent =
        textoEquilibrio(
            balance,
            promedios.flujoProyectado
        );

    const fecha = fechaEquilibrio(
        balance,
        promedios.flujoProyectado
    );

    if (balance >= 0) {
        breakEvenStatus.textContent =
            "El balance actual ya es positivo";
    } else if (fecha) {
        breakEvenStatus.textContent =
            capitalizar(
                nombreMesCompleto(fecha)
            );
    } else {
        breakEvenStatus.textContent =
            "Se requiere flujo mensual positivo";
    }

    amountToRecover.textContent =
        moneda(
            Math.max(
                0,
                Math.abs(
                    Math.min(balance, 0)
                )
            )
        );

    averageMonthlyIncome.textContent =
        moneda(promedios.ingreso);

    averageMonthlyExpenses.textContent =
        moneda(promedios.salida);

    projectionRecurring.textContent =
        moneda(promedios.recurrente);

    actualizarRecuperacion(recuperacion);
}

function actualizarRecuperacion(recuperacion) {
    const porcentaje = Math.max(
        0,
        Math.min(
            100,
            recuperacion.porcentaje
        )
    );

    projectionRecoveryPercent.textContent =
        `${porcentaje.toFixed(1)}%`;

    projectionInitialBalance.textContent =
        moneda(recuperacion.base);

    projectionRecovered.textContent =
        moneda(recuperacion.recuperado);

    projectionPending.textContent =
        moneda(recuperacion.pendiente);

    const grados = porcentaje * 3.6;

    projectionRecoveryRing.style.background = `
        conic-gradient(
            #20a9ff 0deg,
            #20a9ff ${grados}deg,
            rgba(255,255,255,.055) ${grados}deg,
            rgba(255,255,255,.055) 360deg
        )
    `;
}

function actualizarEscenarios() {
    const balance = calcularBalanceActual();
    const promedios = calcularPromedios();

    const actual =
        promedios.flujoProyectado;

    let conservador = 0;
    let crecimiento = 0;

    if (actual > 0) {
        conservador = actual * 0.75;
        crecimiento = actual * 1.25;
    } else if (actual < 0) {
        conservador = actual * 1.25;
        crecimiento = actual * 0.75;
    }

    conservativeFlow.textContent =
        `${moneda(conservador)} / mes`;

    currentFlowScenario.textContent =
        `${moneda(actual)} / mes`;

    growthFlow.textContent =
        `${moneda(crecimiento)} / mes`;

    conservativeBreakEven.textContent =
        textoEquilibrio(
            balance,
            conservador
        );

    currentBreakEven.textContent =
        textoEquilibrio(
            balance,
            actual
        );

    growthBreakEven.textContent =
        textoEquilibrio(
            balance,
            crecimiento
        );
}

function crearGrafica() {
    const canvas = document.getElementById(
        "balanceProjectionChart"
    );

    if (!canvas) {
        return;
    }

    const horizonte =
        Number(projectionHorizon.value) || 12;

    const balance =
        calcularBalanceActual();

    const promedios =
        calcularPromedios();

    const proyeccion = generarProyeccion(
        balance,
        promedios.flujoProyectado,
        horizonte
    );

    const labels = [
        "Actual",
        ...proyeccion.map(item =>
            nombreMes(
                item.fecha,
                horizonte > 12
            )
        )
    ];

    const balances = [
        balance,
        ...proyeccion.map(
            item => item.balance
        )
    ];

    const lineaCero =
        labels.map(() => 0);

    if (projectionChart) {
        projectionChart.destroy();
    }

    projectionChart = new Chart(
        canvas,
        {
            type: "line",

            data: {
                labels,

                datasets: [
                    {
                        label: "Balance proyectado",
                        data: balances,
                        borderColor: "#20a9ff",
                        backgroundColor:
                            "rgba(22,168,255,.10)",
                        fill: true,
                        borderWidth: 2,
                        tension: .32,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: "Equilibrio",
                        data: lineaCero,
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
                        backgroundColor: "#101720",
                        borderColor:
                            "rgba(255,255,255,.07)",
                        borderWidth: 1,

                        callbacks: {
                            label: context => {
                                if (
                                    context.dataset.label ===
                                    "Equilibrio"
                                ) {
                                    return "Punto de equilibrio: $0.00";
                                }

                                return `Balance: ${moneda(context.raw)}`;
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
                            maxTicksLimit: 13
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
                                monedaCompacta(valor)
                        }
                    }
                }
            }
        }
    );
}

function actualizarTabla() {
    const horizonte =
        Number(projectionHorizon.value) || 12;

    const balance =
        calcularBalanceActual();

    const promedios =
        calcularPromedios();

    const proyeccion =
        generarProyeccion(
            balance,
            promedios.flujoProyectado,
            horizonte
        );

    if (!proyeccion.length) {
        projectionTableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No hay información disponible.
                </td>
            </tr>
        `;

        return;
    }

    projectionTableBody.innerHTML =
        proyeccion
            .map(item => {
                let claseFlujo = "neutral";
                let claseBalance = "negative";
                let estado = "Por recuperar";
                let claseEstado = "negative";

                if (item.flujo > 0) {
                    claseFlujo = "positive";
                }

                if (item.flujo < 0) {
                    claseFlujo = "negative";
                }

                if (item.balance >= 0) {
                    claseBalance = "positive";
                    estado = "Equilibrio";
                    claseEstado = "equilibrium";
                }

                return `
                    <tr>

                        <td>
                            ${escapar(
                                capitalizar(
                                    nombreMesCompleto(
                                        item.fecha
                                    )
                                )
                            )}
                        </td>

                        <td class="${claseFlujo}">
                            ${
                                item.flujo > 0
                                    ? "+"
                                    : ""
                            }${moneda(item.flujo)}
                        </td>

                        <td class="${claseBalance}">
                            ${moneda(item.balance)}
                        </td>

                        <td>
                            <span class="projection-status ${claseEstado}">
                                ${estado}
                            </span>
                        </td>

                    </tr>
                `;
            })
            .join("");
}

function crearInsight(
    tipo,
    icono,
    titulo,
    texto
) {
    return `
        <div class="projection-insight ${tipo}">

            <div class="projection-insight-icon">
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

function actualizarInsights() {
    const balance =
        calcularBalanceActual();

    const promedios =
        calcularPromedios();

    const recuperacion =
        calcularRecuperacion();

    if (
        promedios.mesesActivos === 0 &&
        movimientos.length === 0
    ) {
        projectionInsights.innerHTML = `
            <div class="projection-empty">

                <i data-lucide="scan-line"></i>

                <strong>
                    Sin datos suficientes
                </strong>

                <span>
                    Registra movimientos para generar una proyección financiera.
                </span>

            </div>
        `;

        lucide.createIcons();
        return;
    }

    const insights = [];

    if (promedios.flujoProyectado > 0) {
        insights.push(
            crearInsight(
                "positive",
                "trending-up",
                "Tendencia favorable",
                `La tendencia actual genera aproximadamente ${moneda(promedios.flujoProyectado)} de avance neto mensual.`
            )
        );
    } else if (promedios.flujoProyectado < 0) {
        insights.push(
            crearInsight(
                "negative",
                "trending-down",
                "Tendencia negativa",
                `Con los datos actuales, el balance podría disminuir aproximadamente ${moneda(Math.abs(promedios.flujoProyectado))} por mes.`
            )
        );
    } else {
        insights.push(
            crearInsight(
                "warning",
                "minus",
                "Sin avance mensual",
                "La tendencia calculada no genera recuperación neta en este momento."
            )
        );
    }

    if (balance < 0) {
        if (promedios.flujoProyectado > 0) {
            const meses =
                mesesParaEquilibrio(
                    balance,
                    promedios.flujoProyectado
                );

            const fecha =
                fechaEquilibrio(
                    balance,
                    promedios.flujoProyectado
                );

            insights.push(
                crearInsight(
                    "info",
                    "calendar-clock",
                    "Punto de equilibrio estimado",
                    `Manteniendo esta tendencia, el equilibrio se alcanzaría aproximadamente en ${meses} ${meses === 1 ? "mes" : "meses"}, alrededor de ${capitalizar(nombreMesCompleto(fecha))}.`
                )
            );
        } else {
            insights.push(
                crearInsight(
                    "warning",
                    "triangle-alert",
                    "Sin fecha de equilibrio",
                    "El flujo mensual estimado no es positivo, por lo que actualmente no existe una fecha proyectada para llegar a cero."
                )
            );
        }
    } else {
        insights.push(
            crearInsight(
                "positive",
                "circle-check",
                "Equilibrio alcanzado",
                "El balance financiero actual ya se encuentra en cero o en terreno positivo."
            )
        );
    }

    if (promedios.recurrente > 0) {
        const impacto =
            promedios.ingreso > 0
                ? (
                    promedios.recurrente /
                    promedios.ingreso
                ) * 100
                : null;

        if (impacto !== null) {
            insights.push(
                crearInsight(
                    impacto >= 50
                        ? "warning"
                        : "info",
                    "repeat-2",
                    "Compromisos recurrentes",
                    `Los gastos recurrentes representan aproximadamente el ${impacto.toFixed(1)}% del ingreso mensual promedio.`
                )
            );
        } else {
            insights.push(
                crearInsight(
                    "info",
                    "repeat-2",
                    "Compromisos recurrentes",
                    `Actualmente existen aproximadamente ${moneda(promedios.recurrente)} mensuales en compromisos recurrentes activos.`
                )
            );
        }
    }

    insights.push(
        crearInsight(
            "info",
            "target",
            "Recuperación acumulada",
            `Se ha recuperado aproximadamente el ${recuperacion.porcentaje.toFixed(1)}% de la base inicial registrada.`
        )
    );

    projectionInsights.innerHTML =
        insights
            .slice(0, 4)
            .join("");

    lucide.createIcons();
}

function actualizarTodo() {
    actualizarCabecera();
    actualizarEscenarios();
    crearGrafica();
    actualizarTabla();
    actualizarInsights();

    lucide.createIcons();
}

projectionHorizon?.addEventListener(
    "change",
    () => {
        crearGrafica();
        actualizarTabla();
    }
);

async function iniciar() {
    await Promise.all([
        cargarMovimientos(),
        cargarRecurrentes(),
        cargarConfiguracion()
    ]);

    actualizarTodo();
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
                "Error cargando proyecciones:",
                error
            );

            securityLoader.innerHTML = `
                <div class="security-loader-content">
                    <span>
                        No fue posible cargar las proyecciones financieras.
                    </span>
                </div>
            `;
        }
    }
);