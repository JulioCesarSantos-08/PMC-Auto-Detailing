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

const totalIncome = document.getElementById("totalIncome");
const monthIncome = document.getElementById("monthIncome");
const yearIncome = document.getElementById("yearIncome");
const averageIncome = document.getElementById("averageIncome");
const monthComparison = document.getElementById("monthComparison");

const chartPeriod = document.getElementById("chartPeriod");
const categoryTotal = document.getElementById("categoryTotal");
const categoryList = document.getElementById("categoryList");

const incomeSearch = document.getElementById("incomeSearch");
const incomeTableBody = document.getElementById("incomeTableBody");
const incomeEmpty = document.getElementById("incomeEmpty");

let ingresos = [];
let incomeChart = null;
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

    return (
        palabras[0][0] +
        palabras[1][0]
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

async function obtenerUsuario(usuario) {
    const referencia = doc(
        db,
        "usuarios",
        usuario.uid
    );

    const snapshot = await getDoc(referencia);

    return snapshot.exists()
        ? snapshot.data()
        : null;
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

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = String(texto || "");
    return elemento.innerHTML;
}

function formatearFecha(movimiento) {
    const fecha = obtenerFecha(movimiento);

    if (!fecha) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(fecha);
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

async function cargarIngresos() {
    const referencia = collection(
        db,
        "finanzas",
        "movimientos",
        "registros"
    );

    const snapshot = await getDocs(referencia);

    ingresos = snapshot.docs
        .map(documento => ({
            id: documento.id,
            ...documento.data()
        }))
        .filter(movimiento =>
            movimiento.tipo === "ingreso" &&
            movimiento.estado !== "cancelado"
        )
        .sort((a, b) => {
            const fechaA =
                obtenerFecha(a)?.getTime() || 0;

            const fechaB =
                obtenerFecha(b)?.getTime() || 0;

            return fechaB - fechaA;
        });

    actualizarEstadisticas();
    crearGraficaIngresos();
    crearGraficaCategorias();
    renderizarTabla(ingresos);
}

function actualizarEstadisticas() {
    const hoy = new Date();

    let total = 0;
    let mes = 0;
    let mesAnterior = 0;
    let anio = 0;

    const anterior = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - 1,
        1
    );

    ingresos.forEach(ingreso => {
        const monto =
            Math.abs(Number(ingreso.monto) || 0);

        const fecha = obtenerFecha(ingreso);

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

        if (
            fecha.getFullYear() === hoy.getFullYear()
        ) {
            anio += monto;
        }
    });

    totalIncome.textContent =
        formatearMoneda(total);

    monthIncome.textContent =
        formatearMoneda(mes);

    yearIncome.textContent =
        formatearMoneda(anio);

    averageIncome.textContent =
        formatearMoneda(
            ingresos.length
                ? total / ingresos.length
                : 0
        );

    monthComparison.className = "";

    if (mesAnterior <= 0) {
        monthComparison.textContent =
            "Sin comparativa disponible";

        return;
    }

    const diferencia =
        ((mes - mesAnterior) / mesAnterior) * 100;

    if (diferencia >= 0) {
        monthComparison.classList.add("positive");

        monthComparison.textContent =
            `↑ ${Math.abs(diferencia).toFixed(1)}% vs. mes anterior`;
    } else {
        monthComparison.classList.add("negative");

        monthComparison.textContent =
            `↓ ${Math.abs(diferencia).toFixed(1)}% vs. mes anterior`;
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

        ingresos.forEach(ingreso => {
            const fechaIngreso =
                obtenerFecha(ingreso);

            if (
                fechaIngreso &&
                fechaIngreso.getMonth() === fecha.getMonth() &&
                fechaIngreso.getFullYear() === fecha.getFullYear()
            ) {
                total += Math.abs(
                    Number(ingreso.monto) || 0
                );
            }
        });

        datos.push({
            etiqueta:
                new Intl.DateTimeFormat(
                    "es-MX",
                    {
                        month: "short"
                    }
                ).format(fecha),

            total
        });
    }

    return datos;
}

function crearGraficaIngresos() {
    const canvas =
        document.getElementById("incomeChart");

    if (!canvas) {
        return;
    }

    const cantidad =
        Number(chartPeriod.value) || 12;

    const datos =
        obtenerDatosMensuales(cantidad);

    if (incomeChart) {
        incomeChart.destroy();
    }

    const contexto = canvas.getContext("2d");

    const gradiente =
        contexto.createLinearGradient(
            0,
            0,
            0,
            280
        );

    gradiente.addColorStop(
        0,
        "rgba(66,217,155,0.22)"
    );

    gradiente.addColorStop(
        1,
        "rgba(66,217,155,0)"
    );

    incomeChart = new Chart(
        contexto,
        {
            type: "line",

            data: {
                labels:
                    datos.map(item => item.etiqueta),

                datasets: [
                    {
                        data:
                            datos.map(item => item.total),

                        borderColor: "#42d99b",
                        backgroundColor: gradiente,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 4
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
                        backgroundColor: "#101720",
                        displayColors: false,

                        callbacks: {
                            label: context =>
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
                            color:
                                "rgba(255,255,255,0.04)"
                        },

                        ticks: {
                            color: "#53606b",

                            callback: valor =>
                                formatearCompacto(valor)
                        }
                    }
                }
            }
        }
    );
}

chartPeriod.addEventListener(
    "change",
    crearGraficaIngresos
);

function obtenerCategorias() {
    const mapa = new Map();

    ingresos.forEach(ingreso => {
        const categoria =
            ingreso.categoria ||
            "Otros ingresos";

        const monto =
            Math.abs(
                Number(ingreso.monto) || 0
            );

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
    const canvas =
        document.getElementById("categoryChart");

    const categorias =
        obtenerCategorias();

    const total =
        categorias.reduce(
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
        "#42d99b",
        "#16a8ff",
        "#ffad5b",
        "#a98cff",
        "#5f7cff",
        "#35c6c8",
        "#ff6472"
    ];

    categoryChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels:
                    categorias.length
                        ? categorias.map(
                            item => item.nombre
                        )
                        : ["Sin ingresos"],

                datasets: [
                    {
                        data:
                            categorias.length
                                ? categorias.map(
                                    item => item.total
                                )
                                : [1],

                        backgroundColor:
                            categorias.length
                                ? categorias.map(
                                    (_, index) =>
                                        colores[
                                            index %
                                            colores.length
                                        ]
                                )
                                : [
                                    "rgba(255,255,255,0.05)"
                                ],

                        borderWidth: 0
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
                        enabled:
                            categorias.length > 0,

                        backgroundColor: "#101720",

                        callbacks: {
                            label: context =>
                                formatearMoneda(
                                    context.raw
                                )
                        }
                    }
                }
            }
        }
    );

    if (!categorias.length) {
        categoryList.innerHTML = `
            <div class="income-category-item">
                <div>
                    <strong>Sin información</strong>
                    <span>Aún no hay categorías</span>
                </div>
            </div>
        `;

        return;
    }

    categoryList.innerHTML =
        categorias
            .slice(0, 5)
            .map((categoria, index) => {
                const porcentaje =
                    total > 0
                        ? (
                            categoria.total /
                            total
                        ) * 100
                        : 0;

                return `
                    <div class="income-category-item">

                        <span
                            class="income-category-dot"
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
    incomeTableBody.innerHTML = "";

    if (!lista.length) {
        incomeEmpty.classList.remove("hidden");
        return;
    }

    incomeEmpty.classList.add("hidden");

    lista.forEach(ingreso => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>
                <div class="income-concept">
                    <strong>
                        ${escaparHTML(
                            ingreso.concepto ||
                            "Ingreso"
                        )}
                    </strong>

                    <span>
                        ${escaparHTML(
                            ingreso.descripcion ||
                            "Sin descripción"
                        )}
                    </span>
                </div>
            </td>

            <td>
                ${escaparHTML(
                    ingreso.categoria ||
                    "Sin categoría"
                )}
            </td>

            <td>
                ${formatearFecha(ingreso)}
            </td>

            <td>
                ${escaparHTML(
                    formatearMetodo(
                        ingreso.metodo
                    )
                )}
            </td>

            <td>
                <strong class="income-amount">
                    +${formatearMoneda(
                        Math.abs(
                            Number(ingreso.monto) || 0
                        )
                    )}
                </strong>
            </td>
        `;

        incomeTableBody.appendChild(fila);
    });
}

incomeSearch.addEventListener(
    "input",
    () => {
        const busqueda =
            incomeSearch.value
                .trim()
                .toLowerCase();

        if (!busqueda) {
            renderizarTabla(ingresos);
            return;
        }

        const filtrados =
            ingresos.filter(ingreso => {
                const texto = [
                    ingreso.concepto,
                    ingreso.descripcion,
                    ingreso.categoria,
                    ingreso.metodo
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

            await cargarIngresos();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error cargando ingresos:",
                error
            );

            await signOut(auth);
            redirigirLogin();
        }
    }
);