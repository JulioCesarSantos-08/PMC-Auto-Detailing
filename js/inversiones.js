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

const totalInvested = document.getElementById("totalInvested");
const monthInvested = document.getElementById("monthInvested");
const yearInvested = document.getElementById("yearInvested");
const investmentCount = document.getElementById("investmentCount");

const chartPeriod = document.getElementById("chartPeriod");
const distributionTotal = document.getElementById("distributionTotal");
const investmentCategoryList = document.getElementById("investmentCategoryList");

const investmentSearch = document.getElementById("investmentSearch");
const investmentTableBody = document.getElementById("investmentTableBody");
const investmentEmpty = document.getElementById("investmentEmpty");

let inversiones = [];
let investmentChart = null;
let categoryChart = null;

function redirigirLogin() {
    window.location.replace("index.html");
}

function obtenerIniciales(nombre) {
    const partes = String(nombre || "P")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return (partes[0][0] + partes[1][0]).toUpperCase();
}

async function obtenerUsuario(usuario) {
    const snapshot = await getDoc(
        doc(db, "usuarios", usuario.uid)
    );

    return snapshot.exists()
        ? snapshot.data()
        : null;
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

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");
    lucide.createIcons();
}

function abrirSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
}

function cerrarSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
}

mobileMenu?.addEventListener("click", abrirSidebar);
sidebarClose?.addEventListener("click", cerrarSidebar);
sidebarOverlay?.addEventListener("click", cerrarSidebar);

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    redirigirLogin();
});

function moneda(valor) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2
    }).format(Number(valor) || 0);
}

function compacto(valor) {
    const numero = Number(valor) || 0;

    if (numero >= 1000000) {
        return `$${(numero / 1000000).toFixed(1)}M`;
    }

    if (numero >= 1000) {
        return `$${(numero / 1000).toFixed(1)}k`;
    }

    return `$${numero.toFixed(0)}`;
}

function obtenerFecha(item) {
    if (item?.fecha?.toDate) {
        return item.fecha.toDate();
    }

    if (typeof item?.fecha === "string") {
        const fecha = new Date(`${item.fecha}T12:00:00`);

        if (!Number.isNaN(fecha.getTime())) {
            return fecha;
        }
    }

    if (item?.creadoEn?.toDate) {
        return item.creadoEn.toDate();
    }

    return null;
}

function fechaTexto(item) {
    const fecha = obtenerFecha(item);

    if (!fecha) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(fecha);
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = String(texto || "");
    return div.innerHTML;
}

async function cargarInversiones() {
    const snapshot = await getDocs(
        collection(
            db,
            "finanzas",
            "movimientos",
            "registros"
        )
    );

    inversiones = snapshot.docs
        .map(documento => ({
            id: documento.id,
            ...documento.data()
        }))
        .filter(item =>
            item.tipo === "inversion" &&
            item.estado !== "cancelado"
        )
        .sort((a, b) =>
            (obtenerFecha(b)?.getTime() || 0) -
            (obtenerFecha(a)?.getTime() || 0)
        );

    actualizarResumen();
    crearGrafica();
    crearDistribucion();
    renderizar(inversiones);
}

function actualizarResumen() {
    const hoy = new Date();

    let total = 0;
    let mes = 0;
    let anio = 0;

    inversiones.forEach(item => {
        const monto = Math.abs(Number(item.monto) || 0);
        const fecha = obtenerFecha(item);

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

        if (fecha.getFullYear() === hoy.getFullYear()) {
            anio += monto;
        }
    });

    totalInvested.textContent = moneda(total);
    monthInvested.textContent = moneda(mes);
    yearInvested.textContent = moneda(anio);
    investmentCount.textContent = inversiones.length;
}

function datosMensuales(cantidad) {
    const hoy = new Date();
    const resultado = [];

    for (let i = cantidad - 1; i >= 0; i--) {
        const mes = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - i,
            1
        );

        let total = 0;

        inversiones.forEach(item => {
            const fecha = obtenerFecha(item);

            if (
                fecha &&
                fecha.getMonth() === mes.getMonth() &&
                fecha.getFullYear() === mes.getFullYear()
            ) {
                total += Math.abs(Number(item.monto) || 0);
            }
        });

        resultado.push({
            nombre: new Intl.DateTimeFormat(
                "es-MX",
                { month: "short" }
            ).format(mes),

            total
        });
    }

    return resultado;
}

function crearGrafica() {
    const canvas = document.getElementById("investmentChart");
    const cantidad = Number(chartPeriod.value) || 12;
    const datos = datosMensuales(cantidad);

    if (investmentChart) {
        investmentChart.destroy();
    }

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(
        0,
        0,
        0,
        280
    );

    gradient.addColorStop(
        0,
        "rgba(255,173,91,.22)"
    );

    gradient.addColorStop(
        1,
        "rgba(255,173,91,0)"
    );

    investmentChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: datos.map(item => item.nombre),

            datasets: [{
                data: datos.map(item => item.total),
                borderColor: "#ffad5b",
                backgroundColor: gradient,
                borderWidth: 2,
                tension: .35,
                fill: true,
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
                            moneda(context.raw)
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
                        color: "rgba(255,255,255,.04)"
                    },

                    ticks: {
                        color: "#53606b",

                        callback: valor =>
                            compacto(valor)
                    }
                }
            }
        }
    });
}

chartPeriod.addEventListener("change", crearGrafica);

function obtenerCategorias() {
    const mapa = new Map();

    inversiones.forEach(item => {
        const categoria =
            item.categoria || "Otras inversiones";

        const monto =
            Math.abs(Number(item.monto) || 0);

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

function crearDistribucion() {
    const categorias = obtenerCategorias();

    const total = categorias.reduce(
        (suma, item) => suma + item.total,
        0
    );

    distributionTotal.textContent = compacto(total);

    const colores = [
        "#ffad5b",
        "#16a8ff",
        "#a98cff",
        "#42d99b",
        "#ff6472",
        "#35c6c8"
    ];

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(
        document.getElementById("investmentCategoryChart"),
        {
            type: "doughnut",

            data: {
                labels:
                    categorias.length
                        ? categorias.map(item => item.nombre)
                        : ["Sin inversiones"],

                datasets: [{
                    data:
                        categorias.length
                            ? categorias.map(item => item.total)
                            : [1],

                    backgroundColor:
                        categorias.length
                            ? categorias.map(
                                (_, i) =>
                                    colores[i % colores.length]
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

                        callbacks: {
                            label: context =>
                                moneda(context.raw)
                        }
                    }
                }
            }
        }
    );

    if (!categorias.length) {
        investmentCategoryList.innerHTML = `
            <div class="investment-category-item">
                <div>
                    <strong>Sin información</strong>
                    <span>Aún no existen inversiones</span>
                </div>
            </div>
        `;

        return;
    }

    investmentCategoryList.innerHTML = categorias
        .slice(0, 5)
        .map((item, i) => {
            const porcentaje =
                total
                    ? (item.total / total) * 100
                    : 0;

            return `
                <div class="investment-category-item">

                    <span
                        class="investment-category-dot"
                        style="background:${colores[i % colores.length]}"
                    ></span>

                    <div>
                        <strong>${escapar(item.nombre)}</strong>
                        <span>${porcentaje.toFixed(1)}%</span>
                    </div>

                    <b>${moneda(item.total)}</b>

                </div>
            `;
        })
        .join("");
}

function renderizar(lista) {
    investmentTableBody.innerHTML = "";

    if (!lista.length) {
        investmentEmpty.classList.remove("hidden");
        return;
    }

    investmentEmpty.classList.add("hidden");

    lista.forEach(item => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>
                <div class="investment-name">

                    <strong>
                        ${escapar(
                            item.concepto ||
                            "Inversión"
                        )}
                    </strong>

                    <span>
                        ${escapar(
                            item.descripcion ||
                            "Sin descripción"
                        )}
                    </span>

                </div>
            </td>

            <td>
                ${escapar(
                    item.categoria ||
                    "Sin categoría"
                )}
            </td>

            <td>
                ${fechaTexto(item)}
            </td>

            <td>
                ${escapar(
                    item.metodo ||
                    "No especificado"
                )}
            </td>

            <td>
                <strong class="investment-amount">
                    ${moneda(
                        Math.abs(
                            Number(item.monto) || 0
                        )
                    )}
                </strong>
            </td>
        `;

        investmentTableBody.appendChild(fila);
    });
}

investmentSearch.addEventListener("input", () => {
    const busqueda =
        investmentSearch.value
            .trim()
            .toLowerCase();

    if (!busqueda) {
        renderizar(inversiones);
        return;
    }

    const resultados = inversiones.filter(item => {
        return [
            item.concepto,
            item.descripcion,
            item.categoria,
            item.metodo
        ]
            .join(" ")
            .toLowerCase()
            .includes(busqueda);
    });

    renderizar(resultados);
});

onAuthStateChanged(auth, async usuario => {
    if (!usuario) {
        redirigirLogin();
        return;
    }

    try {
        const datos = await obtenerUsuario(usuario);

        if (
            !datos ||
            datos?.permisos?.finanzas !== true
        ) {
            await signOut(auth);
            redirigirLogin();
            return;
        }

        cargarUsuario(datos, usuario);

        await cargarInversiones();

        mostrarAplicacion();

    } catch (error) {
        console.error(
            "Error cargando inversiones:",
            error
        );

        await signOut(auth);
        redirigirLogin();
    }
});