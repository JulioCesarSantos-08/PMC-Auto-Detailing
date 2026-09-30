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

const totalExpenses = document.getElementById("totalExpenses");
const monthExpenses = document.getElementById("monthExpenses");
const yearExpenses = document.getElementById("yearExpenses");
const averageExpense = document.getElementById("averageExpense");
const monthComparison = document.getElementById("monthComparison");

const chartPeriod = document.getElementById("chartPeriod");
const categoryTotal = document.getElementById("categoryTotal");
const categoryList = document.getElementById("categoryList");

const expenseSearch = document.getElementById("expenseSearch");
const expenseTableBody = document.getElementById("expenseTableBody");
const expenseEmpty = document.getElementById("expenseEmpty");

let egresos = [];
let expenseChart = null;
let categoryChart = null;

function redirigirLogin() {
    window.location.replace("index.html");
}

function obtenerIniciales(nombre) {
    const palabras = String(nombre || "P")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (palabras.length === 1) {
        return palabras[0][0].toUpperCase();
    }

    return (palabras[0][0] + palabras[1][0]).toUpperCase();
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

async function obtenerUsuario(usuario) {
    const referencia = doc(db, "usuarios", usuario.uid);
    const snapshot = await getDoc(referencia);

    return snapshot.exists() ? snapshot.data() : null;
}

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");

    lucide.createIcons();
}

function abrirSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");

    if (window.innerWidth <= 900) {
        document.body.style.overflow = "hidden";
    }
}

function cerrarSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

mobileMenu?.addEventListener("click", abrirSidebar);
sidebarClose?.addEventListener("click", cerrarSidebar);
sidebarOverlay?.addEventListener("click", cerrarSidebar);

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    redirigirLogin();
});

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(valor) || 0);
}

function formatearCompacto(valor) {
    const numero = Number(valor) || 0;

    if (Math.abs(numero) >= 1000000) {
        return `$${(numero / 1000000).toFixed(1)}M`;
    }

    if (Math.abs(numero) >= 1000) {
        return `$${(numero / 1000).toFixed(1)}k`;
    }

    return `$${numero.toFixed(0)}`;
}

function obtenerFecha(movimiento) {
    if (movimiento?.fecha?.toDate) {
        return movimiento.fecha.toDate();
    }

    if (typeof movimiento?.fecha === "string") {
        const fecha = new Date(`${movimiento.fecha}T12:00:00`);

        if (!Number.isNaN(fecha.getTime())) {
            return fecha;
        }
    }

    if (movimiento?.creadoEn?.toDate) {
        return movimiento.creadoEn.toDate();
    }

    return null;
}

function formatearFecha(movimiento) {
    const fecha = obtenerFecha(movimiento);

    if (!fecha) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(fecha);
}

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

function formatearMetodo(metodo) {
    const nombres = {
        efectivo: "Efectivo",
        transferencia: "Transferencia",
        tarjeta: "Tarjeta",
        otro: "Otro"
    };

    return nombres[metodo] || metodo || "Otro";
}

async function cargarEgresos() {
    const referencia = collection(
        db,
        "finanzas",
        "movimientos",
        "registros"
    );

    const snapshot = await getDocs(referencia);

    egresos = snapshot.docs
        .map(documento => ({
            id: documento.id,
            ...documento.data()
        }))
        .filter(movimiento =>
            movimiento.tipo === "egreso" &&
            movimiento.estado !== "cancelado"
        )
        .sort((a, b) => {
            const fechaA = obtenerFecha(a)?.getTime() || 0;
            const fechaB = obtenerFecha(b)?.getTime() || 0;

            return fechaB - fechaA;
        });

    actualizarEstadisticas();
    crearGraficaEgresos();
    crearGraficaCategorias();
    renderizarTabla(egresos);
}

function actualizarEstadisticas() {
    const hoy = new Date();

    const anterior = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - 1,
        1
    );

    let total = 0;
    let mes = 0;
    let mesAnterior = 0;
    let anio = 0;

    egresos.forEach(egreso => {
        const monto = Math.abs(Number(egreso.monto) || 0);
        const fecha = obtenerFecha(egreso);

        total += monto;

        if (!fecha) {
            return;
        }

        if (
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getFullYear() === hoy.getFullYear()
        ) {
            mes += monto;
        }

        if (
            fecha.getMonth() === anterior.getMonth() &&
            fecha.getFullYear() === anterior.getFullYear()
        ) {
            mesAnterior += monto;
        }

        if (fecha.getFullYear() === hoy.getFullYear()) {
            anio += monto;
        }
    });

    totalExpenses.textContent = formatearMoneda(total);
    monthExpenses.textContent = formatearMoneda(mes);
    yearExpenses.textContent = formatearMoneda(anio);

    averageExpense.textContent = formatearMoneda(
        egresos.length ? total / egresos.length : 0
    );

    monthComparison.className = "";

    if (mesAnterior <= 0) {
        monthComparison.textContent = "Sin comparativa disponible";
        return;
    }

    const diferencia =
        ((mes - mesAnterior) / mesAnterior) * 100;

    if (diferencia <= 0) {
        monthComparison.classList.add("positive");
        monthComparison.textContent =
            `↓ ${Math.abs(diferencia).toFixed(1)}% vs. mes anterior`;
    } else {
        monthComparison.classList.add("negative");
        monthComparison.textContent =
            `↑ ${Math.abs(diferencia).toFixed(1)}% vs. mes anterior`;
    }
}

function obtenerDatosMensuales(cantidad) {
    const hoy = new Date();
    const datos = [];

    for (let i = cantidad - 1; i >= 0; i--) {
        const fecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - i,
            1
        );

        let total = 0;

        egresos.forEach(egreso => {
            const fechaEgreso = obtenerFecha(egreso);

            if (
                fechaEgreso &&
                fechaEgreso.getMonth() === fecha.getMonth() &&
                fechaEgreso.getFullYear() === fecha.getFullYear()
            ) {
                total += Math.abs(Number(egreso.monto) || 0);
            }
        });

        datos.push({
            etiqueta: new Intl.DateTimeFormat("es-MX", {
                month: "short"
            }).format(fecha),

            total
        });
    }

    return datos;
}

function crearGraficaEgresos() {
    const canvas = document.getElementById("expenseChart");

    if (!canvas) {
        return;
    }

    const cantidad = Number(chartPeriod.value) || 12;
    const datos = obtenerDatosMensuales(cantidad);

    if (expenseChart) {
        expenseChart.destroy();
    }

    const contexto = canvas.getContext("2d");

    const gradiente = contexto.createLinearGradient(
        0,
        0,
        0,
        280
    );

    gradiente.addColorStop(
        0,
        "rgba(255,100,114,0.20)"
    );

    gradiente.addColorStop(
        1,
        "rgba(255,100,114,0)"
    );

    expenseChart = new Chart(contexto, {
        type: "line",

        data: {
            labels: datos.map(item => item.etiqueta),

            datasets: [{
                data: datos.map(item => item.total),
                borderColor: "#ff6472",
                backgroundColor: gradiente,
                borderWidth: 2,
                fill: true,
                tension: .35,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#101720",
                    displayColors: false,

                    callbacks: {
                        label: context =>
                            formatearMoneda(context.raw)
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
                        font: {
                            size: 10
                        }
                    }
                },

                y: {
                    beginAtZero: true,

                    border: {
                        display: false
                    },

                    grid: {
                        color: "rgba(255,255,255,.04)"
                    },

                    ticks: {
                        color: "#53606b",

                        callback: valor =>
                            formatearCompacto(valor)
                    }
                }
            }
        }
    });
}

chartPeriod.addEventListener(
    "change",
    crearGraficaEgresos
);

function obtenerCategorias() {
    const mapa = new Map();

    egresos.forEach(egreso => {
        const categoria =
            egreso.categoria || "Otros egresos";

        const monto =
            Math.abs(Number(egreso.monto) || 0);

        mapa.set(
            categoria,
            (mapa.get(categoria) || 0) + monto
        );
    });

    return [...mapa.entries()]
        .map(([nombre, total]) => ({
            nombre,
            total
        }))
        .sort((a, b) => b.total - a.total);
}

function crearGraficaCategorias() {
    const canvas = document.getElementById("categoryChart");
    const categorias = obtenerCategorias();

    const total = categorias.reduce(
        (suma, categoria) =>
            suma + categoria.total,
        0
    );

    categoryTotal.textContent =
        formatearCompacto(total);

    if (categoryChart) {
        categoryChart.destroy();
    }

    const colores = [
        "#ff6472",
        "#ffad5b",
        "#16a8ff",
        "#a98cff",
        "#42d99b",
        "#5f7cff",
        "#35c6c8"
    ];

    categoryChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels:
                categorias.length
                    ? categorias.map(item => item.nombre)
                    : ["Sin egresos"],

            datasets: [{
                data:
                    categorias.length
                        ? categorias.map(item => item.total)
                        : [1],

                backgroundColor:
                    categorias.length
                        ? categorias.map(
                            (_, index) =>
                                colores[index % colores.length]
                        )
                        : ["rgba(255,255,255,.05)"],

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
                    enabled: categorias.length > 0,

                    backgroundColor: "#101720",

                    callbacks: {
                        label: context =>
                            formatearMoneda(context.raw)
                    }
                }
            }
        }
    });

    if (!categorias.length) {
        categoryList.innerHTML = `
            <div class="expense-category-item">
                <div>
                    <strong>Sin información</strong>
                    <span>Aún no hay categorías</span>
                </div>
            </div>
        `;

        return;
    }

    categoryList.innerHTML = categorias
        .slice(0, 5)
        .map((categoria, index) => {
            const porcentaje =
                total > 0
                    ? (categoria.total / total) * 100
                    : 0;

            return `
                <div class="expense-category-item">

                    <span
                        class="expense-category-dot"
                        style="background:${colores[index % colores.length]}"
                    ></span>

                    <div>
                        <strong>
                            ${escaparHTML(categoria.nombre)}
                        </strong>

                        <span>
                            ${porcentaje.toFixed(1)}%
                        </span>
                    </div>

                    <b>
                        ${formatearMoneda(categoria.total)}
                    </b>

                </div>
            `;
        })
        .join("");
}

function renderizarTabla(lista) {
    expenseTableBody.innerHTML = "";

    if (!lista.length) {
        expenseEmpty.classList.remove("hidden");
        return;
    }

    expenseEmpty.classList.add("hidden");

    lista.forEach(egreso => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>
                <div class="expense-concept">

                    <strong>
                        ${escaparHTML(
                            egreso.concepto || "Egreso"
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            egreso.descripcion ||
                            "Sin descripción"
                        )}
                    </span>

                </div>
            </td>

            <td>
                ${escaparHTML(
                    egreso.categoria ||
                    "Sin categoría"
                )}
            </td>

            <td>
                ${formatearFecha(egreso)}
            </td>

            <td>
                ${escaparHTML(
                    formatearMetodo(egreso.metodo)
                )}
            </td>

            <td>
                <strong class="expense-amount">
                    -${formatearMoneda(
                        Math.abs(
                            Number(egreso.monto) || 0
                        )
                    )}
                </strong>
            </td>
        `;

        expenseTableBody.appendChild(fila);
    });
}

expenseSearch.addEventListener(
    "input",
    () => {
        const busqueda =
            expenseSearch.value
                .trim()
                .toLowerCase();

        if (!busqueda) {
            renderizarTabla(egresos);
            return;
        }

        const filtrados = egresos.filter(egreso => {
            const texto = [
                egreso.concepto,
                egreso.descripcion,
                egreso.categoria,
                egreso.metodo
            ]
                .join(" ")
                .toLowerCase();

            return texto.includes(busqueda);
        });

        renderizarTabla(filtrados);
    }
);

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

            cargarUsuario(datos, usuario);

            await cargarEgresos();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error cargando egresos:",
                error
            );

            await signOut(auth);
            redirigirLogin();
        }
    }
);