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
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
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

const monthlyCommitment = document.getElementById("monthlyCommitment");
const annualProjection = document.getElementById("annualProjection");
const activeRecurring = document.getElementById("activeRecurring");
const nextPayment = document.getElementById("nextPayment");
const nextPaymentDescription = document.getElementById("nextPaymentDescription");

const distributionTotal = document.getElementById("distributionTotal");
const recurringCategoryList = document.getElementById("recurringCategoryList");

const recurringSearch = document.getElementById("recurringSearch");
const statusFilter = document.getElementById("statusFilter");
const recurringTableBody = document.getElementById("recurringTableBody");
const recurringEmpty = document.getElementById("recurringEmpty");

const newRecurringButton = document.getElementById("newRecurringButton");
const emptyNewRecurringButton = document.getElementById("emptyNewRecurringButton");

const recurringModal = document.getElementById("recurringModal");
const closeRecurringModal = document.getElementById("closeRecurringModal");
const cancelRecurringButton = document.getElementById("cancelRecurringButton");

const recurringForm = document.getElementById("recurringForm");
const saveRecurringButton = document.getElementById("saveRecurringButton");

const recurringConcept = document.getElementById("recurringConcept");
const recurringAmount = document.getElementById("recurringAmount");
const recurringFrequency = document.getElementById("recurringFrequency");
const recurringCategory = document.getElementById("recurringCategory");
const recurringNextDate = document.getElementById("recurringNextDate");
const recurringMethod = document.getElementById("recurringMethod");
const recurringStatus = document.getElementById("recurringStatus");
const recurringDescription = document.getElementById("recurringDescription");

let recurrentes = [];
let recurringChart = null;
let categoryChart = null;
let editingId = null;

function redirigirLogin() {
    window.location.replace("index.html");
}

function obtenerIniciales(nombre) {
    const partes = String(nombre || "P")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) {
        return "P";
    }

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return (
        partes[0][0] +
        partes[1][0]
    ).toUpperCase();
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

logoutButton?.addEventListener(
    "click",
    async () => {
        await signOut(auth);
        redirigirLogin();
    }
);

function moneda(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2
        }
    ).format(Number(valor) || 0);
}

function monedaCompacta(valor) {
    const numero = Number(valor) || 0;

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

function fechaLocalDesdeString(valor) {
    if (!valor) {
        return null;
    }

    const partes = String(valor).split("-");

    if (partes.length !== 3) {
        return null;
    }

    const anio = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);

    if (!anio || !mes || !dia) {
        return null;
    }

    const fecha = new Date(
        anio,
        mes - 1,
        dia,
        12,
        0,
        0
    );

    if (Number.isNaN(fecha.getTime())) {
        return null;
    }

    return fecha;
}

function fechaAString(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function fechaBonita(valor) {
    const fecha = fechaLocalDesdeString(valor);

    if (!fecha) {
        return "--";
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

function fechaCorta(valor) {
    const fecha = fechaLocalDesdeString(valor);

    if (!fecha) {
        return "--";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "numeric",
            month: "short"
        }
    ).format(fecha);
}

function capitalizar(texto) {
    const valor = String(texto || "");

    if (!valor) {
        return "";
    }

    return (
        valor.charAt(0).toUpperCase() +
        valor.slice(1)
    );
}

function montoMensual(item) {
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

function montoAnual(item) {
    const monto = Math.abs(
        Number(item.monto) || 0
    );

    switch (item.frecuencia) {
        case "semanal":
            return monto * 52;

        case "quincenal":
            return monto * 24;

        case "mensual":
            return monto * 12;

        case "bimestral":
            return monto * 6;

        case "trimestral":
            return monto * 4;

        case "semestral":
            return monto * 2;

        case "anual":
            return monto;

        default:
            return monto * 12;
    }
}

function obtenerActivos() {
    return recurrentes.filter(
        item => item.estado === "activo"
    );
}

async function cargarRecurrentes() {
    const snapshot = await getDocs(
        collection(
            db,
            "finanzas",
            "recurrentes",
            "registros"
        )
    );

    recurrentes = snapshot.docs.map(
        documento => ({
            id: documento.id,
            ...documento.data()
        })
    );

    recurrentes.sort((a, b) => {
        const fechaA =
            fechaLocalDesdeString(a.proximoPago)
                ?.getTime() || Infinity;

        const fechaB =
            fechaLocalDesdeString(b.proximoPago)
                ?.getTime() || Infinity;

        return fechaA - fechaB;
    });

    actualizarTodo();
}

function actualizarTodo() {
    actualizarResumen();
    crearGrafica();
    crearDistribucion();
    aplicarFiltros();

    lucide.createIcons();
}

function actualizarResumen() {
    const activos = obtenerActivos();

    const mensual = activos.reduce(
        (total, item) =>
            total + montoMensual(item),
        0
    );

    const anual = activos.reduce(
        (total, item) =>
            total + montoAnual(item),
        0
    );

    monthlyCommitment.textContent =
        moneda(mensual);

    annualProjection.textContent =
        moneda(anual);

    activeRecurring.textContent =
        activos.length;

    actualizarProximoPago(activos);
}

function actualizarProximoPago(activos) {
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const candidatos = activos
        .map(item => ({
            ...item,
            fechaCalculada:
                fechaLocalDesdeString(
                    item.proximoPago
                )
        }))
        .filter(item =>
            item.fechaCalculada &&
            item.fechaCalculada >= hoy
        )
        .sort(
            (a, b) =>
                a.fechaCalculada -
                b.fechaCalculada
        );

    if (!candidatos.length) {
        nextPayment.textContent = "--";

        nextPaymentDescription.textContent =
            "Sin pagos programados";

        return;
    }

    const siguiente = candidatos[0];

    nextPayment.textContent =
        fechaCorta(siguiente.proximoPago);

    nextPaymentDescription.textContent =
        `${siguiente.concepto} · ${moneda(
            siguiente.monto
        )}`;
}

function sumarMeses(fecha, cantidad) {
    const resultado = new Date(fecha);

    resultado.setMonth(
        resultado.getMonth() + cantidad
    );

    return resultado;
}

function sumarDias(fecha, cantidad) {
    const resultado = new Date(fecha);

    resultado.setDate(
        resultado.getDate() + cantidad
    );

    return resultado;
}

function siguienteFecha(fecha, frecuencia) {
    switch (frecuencia) {
        case "semanal":
            return sumarDias(fecha, 7);

        case "quincenal":
            return sumarDias(fecha, 15);

        case "mensual":
            return sumarMeses(fecha, 1);

        case "bimestral":
            return sumarMeses(fecha, 2);

        case "trimestral":
            return sumarMeses(fecha, 3);

        case "semestral":
            return sumarMeses(fecha, 6);

        case "anual":
            return sumarMeses(fecha, 12);

        default:
            return sumarMeses(fecha, 1);
    }
}

function obtenerProyeccionMensual() {
    const hoy = new Date();

    const meses = [];

    for (let i = 0; i < 12; i++) {
        const fecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth() + i,
            1
        );

        meses.push({
            fecha,
            total: 0
        });
    }

    const inicioPeriodo =
        new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            1
        );

    const finPeriodo =
        new Date(
            hoy.getFullYear(),
            hoy.getMonth() + 12,
            0,
            23,
            59,
            59
        );

    obtenerActivos().forEach(item => {
        let fechaPago =
            fechaLocalDesdeString(
                item.proximoPago
            );

        if (!fechaPago) {
            return;
        }

        let seguridad = 0;

        while (
            fechaPago < inicioPeriodo &&
            seguridad < 1000
        ) {
            fechaPago =
                siguienteFecha(
                    fechaPago,
                    item.frecuencia
                );

            seguridad++;
        }

        seguridad = 0;

        while (
            fechaPago <= finPeriodo &&
            seguridad < 1000
        ) {
            const indice =
                (
                    fechaPago.getFullYear() -
                    inicioPeriodo.getFullYear()
                ) * 12 +
                (
                    fechaPago.getMonth() -
                    inicioPeriodo.getMonth()
                );

            if (
                indice >= 0 &&
                indice < 12
            ) {
                meses[indice].total +=
                    Math.abs(
                        Number(item.monto) || 0
                    );
            }

            fechaPago =
                siguienteFecha(
                    fechaPago,
                    item.frecuencia
                );

            seguridad++;
        }
    });

    return meses;
}

function crearGrafica() {
    const canvas =
        document.getElementById(
            "recurringChart"
        );

    if (!canvas) {
        return;
    }

    const meses =
        obtenerProyeccionMensual();

    if (recurringChart) {
        recurringChart.destroy();
    }

    const ctx = canvas.getContext("2d");

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            280
        );

    gradient.addColorStop(
        0,
        "rgba(22,168,255,.22)"
    );

    gradient.addColorStop(
        1,
        "rgba(22,168,255,0)"
    );

    recurringChart = new Chart(
        ctx,
        {
            type: "line",

            data: {
                labels: meses.map(item =>
                    new Intl.DateTimeFormat(
                        "es-MX",
                        {
                            month: "short"
                        }
                    ).format(item.fecha)
                ),

                datasets: [{
                    data: meses.map(
                        item => item.total
                    ),

                    borderColor: "#16a8ff",
                    backgroundColor: gradient,
                    borderWidth: 2,
                    tension: .35,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor:
                        "#16a8ff"
                }]
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
                        backgroundColor:
                            "#101720",

                        borderColor:
                            "rgba(255,255,255,.06)",

                        borderWidth: 1,

                        displayColors: false,

                        callbacks: {
                            label: context =>
                                moneda(
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

function obtenerCategorias() {
    const mapa = new Map();

    obtenerActivos().forEach(item => {
        const categoria =
            item.categoria ||
            "Otros";

        const mensual =
            montoMensual(item);

        mapa.set(
            categoria,
            (
                mapa.get(categoria) || 0
            ) + mensual
        );
    });

    return [...mapa.entries()]
        .map(
            ([nombre, total]) => ({
                nombre,
                total
            })
        )
        .sort(
            (a, b) =>
                b.total - a.total
        );
}

function crearDistribucion() {
    const categorias =
        obtenerCategorias();

    const total =
        categorias.reduce(
            (suma, item) =>
                suma + item.total,
            0
        );

    distributionTotal.textContent =
        monedaCompacta(total);

    const colores = [
        "#16a8ff",
        "#42d99b",
        "#a98cff",
        "#ffad5b",
        "#ff6472",
        "#35c6c8",
        "#6f8cff",
        "#c6d85b",
        "#d881ff"
    ];

    if (categoryChart) {
        categoryChart.destroy();
    }

    const canvas =
        document.getElementById(
            "recurringCategoryChart"
        );

    categoryChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels:
                    categorias.length
                        ? categorias.map(
                            item =>
                                item.nombre
                        )
                        : [
                            "Sin recurrentes"
                        ],

                datasets: [{
                    data:
                        categorias.length
                            ? categorias.map(
                                item =>
                                    item.total
                            )
                            : [1],

                    backgroundColor:
                        categorias.length
                            ? categorias.map(
                                (_, i) =>
                                    colores[
                                        i %
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
                        enabled:
                            categorias.length >
                            0,

                        callbacks: {
                            label: context =>
                                moneda(
                                    context.raw
                                )
                        }
                    }
                }
            }
        }
    );

    if (!categorias.length) {
        recurringCategoryList.innerHTML = `
            <div class="recurring-category-item">
                <div>
                    <strong>Sin información</strong>
                    <span>No hay compromisos activos</span>
                </div>
            </div>
        `;

        return;
    }

    recurringCategoryList.innerHTML =
        categorias
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
                    <div class="recurring-category-item">

                        <span
                            class="recurring-category-dot"
                            style="background:${
                                colores[
                                    indice %
                                    colores.length
                                ]
                            }"
                        ></span>

                        <div>
                            <strong>
                                ${escapar(
                                    item.nombre
                                )}
                            </strong>

                            <span>
                                ${porcentaje.toFixed(1)}%
                            </span>
                        </div>

                        <b>
                            ${moneda(item.total)}
                        </b>

                    </div>
                `;
            })
            .join("");
}

function renderizar(lista) {
    recurringTableBody.innerHTML = "";

    if (!lista.length) {
        recurringEmpty.classList.remove(
            "hidden"
        );

        return;
    }

    recurringEmpty.classList.add(
        "hidden"
    );

    lista.forEach(item => {
        const fila =
            document.createElement("tr");

        const estado =
            item.estado === "pausado"
                ? "pausado"
                : "activo";

        fila.innerHTML = `
            <td>
                <div class="recurring-concept">

                    <strong>
                        ${escapar(
                            item.concepto ||
                            "Sin concepto"
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
                    "Otros"
                )}
            </td>

            <td>
                ${escapar(
                    capitalizar(
                        item.frecuencia ||
                        "mensual"
                    )
                )}
            </td>

            <td>
                ${fechaBonita(
                    item.proximoPago
                )}
            </td>

            <td>
                <span
                    class="recurring-status ${
                        estado === "activo"
                            ? "active"
                            : "paused"
                    }"
                >
                    ${capitalizar(estado)}
                </span>
            </td>

            <td>
                <strong
                    class="recurring-amount"
                >
                    ${moneda(item.monto)}
                </strong>
            </td>

            <td>
                <div
                    class="recurring-row-actions"
                >

                    <button
                        type="button"
                        class="recurring-action-button edit"
                        data-id="${item.id}"
                        title="Editar"
                    >
                        <i data-lucide="pencil"></i>
                    </button>

                    <button
                        type="button"
                        class="recurring-action-button toggle"
                        data-id="${item.id}"
                        title="${
                            estado === "activo"
                                ? "Pausar"
                                : "Reactivar"
                        }"
                    >
                        <i
                            data-lucide="${
                                estado === "activo"
                                    ? "pause"
                                    : "play"
                            }"
                        ></i>
                    </button>

                    <button
                        type="button"
                        class="recurring-action-button delete"
                        data-id="${item.id}"
                        title="Eliminar"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>

                </div>
            </td>
        `;

        recurringTableBody.appendChild(
            fila
        );
    });

    lucide.createIcons();

    document
        .querySelectorAll(
            ".recurring-action-button.edit"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => {
                    editarRecurrente(
                        boton.dataset.id
                    );
                }
            );
        });

    document
        .querySelectorAll(
            ".recurring-action-button.toggle"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => {
                    cambiarEstado(
                        boton.dataset.id
                    );
                }
            );
        });

    document
        .querySelectorAll(
            ".recurring-action-button.delete"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => {
                    eliminarRecurrente(
                        boton.dataset.id
                    );
                }
            );
        });
}

function aplicarFiltros() {
    const busqueda =
        recurringSearch.value
            .trim()
            .toLowerCase();

    const estado =
        statusFilter.value;

    const resultados =
        recurrentes.filter(item => {
            const texto = [
                item.concepto,
                item.descripcion,
                item.categoria,
                item.frecuencia,
                item.metodo
            ]
                .join(" ")
                .toLowerCase();

            const coincideBusqueda =
                !busqueda ||
                texto.includes(busqueda);

            const coincideEstado =
                estado === "todos" ||
                item.estado === estado;

            return (
                coincideBusqueda &&
                coincideEstado
            );
        });

    renderizar(resultados);
}

recurringSearch.addEventListener(
    "input",
    aplicarFiltros
);

statusFilter.addEventListener(
    "change",
    aplicarFiltros
);

function establecerFechaPredeterminada() {
    if (recurringNextDate.value) {
        return;
    }

    const hoy = new Date();

    recurringNextDate.value =
        fechaAString(hoy);
}

function abrirModalNuevo() {
    editingId = null;

    recurringForm.reset();

    recurringFrequency.value =
        "mensual";

    recurringCategory.value =
        "Renta";

    recurringMethod.value =
        "transferencia";

    recurringStatus.value =
        "activo";

    establecerFechaPredeterminada();

    document.querySelector(
        ".recurring-modal-header h2"
    ).textContent =
        "Registrar gasto recurrente";

    document.querySelector(
        ".recurring-modal-header p"
    ).textContent =
        "Agrega un pago periódico del negocio.";

    saveRecurringButton.innerHTML = `
        <i data-lucide="save"></i>
        Guardar recurrente
    `;

    recurringModal.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";

    lucide.createIcons();

    setTimeout(
        () => recurringConcept.focus(),
        100
    );
}

function cerrarModal() {
    recurringModal.classList.remove(
        "active"
    );

    document.body.style.overflow = "";

    recurringForm.reset();

    editingId = null;
}

newRecurringButton.addEventListener(
    "click",
    abrirModalNuevo
);

emptyNewRecurringButton.addEventListener(
    "click",
    abrirModalNuevo
);

closeRecurringModal.addEventListener(
    "click",
    cerrarModal
);

cancelRecurringButton.addEventListener(
    "click",
    cerrarModal
);

recurringModal.addEventListener(
    "click",
    evento => {
        if (
            evento.target ===
            recurringModal
        ) {
            cerrarModal();
        }
    }
);

document.addEventListener(
    "keydown",
    evento => {
        if (
            evento.key === "Escape" &&
            recurringModal.classList.contains(
                "active"
            )
        ) {
            cerrarModal();
        }
    }
);

function editarRecurrente(id) {
    const item =
        recurrentes.find(
            recurrente =>
                recurrente.id === id
        );

    if (!item) {
        return;
    }

    editingId = id;

    recurringConcept.value =
        item.concepto || "";

    recurringAmount.value =
        Number(item.monto) || "";

    recurringFrequency.value =
        item.frecuencia || "mensual";

    recurringCategory.value =
        item.categoria || "Otros";

    recurringNextDate.value =
        item.proximoPago || "";

    recurringMethod.value =
        item.metodo || "transferencia";

    recurringStatus.value =
        item.estado || "activo";

    recurringDescription.value =
        item.descripcion || "";

    document.querySelector(
        ".recurring-modal-header h2"
    ).textContent =
        "Editar gasto recurrente";

    document.querySelector(
        ".recurring-modal-header p"
    ).textContent =
        "Actualiza la información del compromiso.";

    saveRecurringButton.innerHTML = `
        <i data-lucide="save"></i>
        Guardar cambios
    `;

    recurringModal.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";

    lucide.createIcons();
}

recurringForm.addEventListener(
    "submit",
    async evento => {
        evento.preventDefault();

        const concepto =
            recurringConcept.value.trim();

        const monto =
            Number(
                recurringAmount.value
            );

        const frecuencia =
            recurringFrequency.value;

        const categoria =
            recurringCategory.value;

        const proximoPago =
            recurringNextDate.value;

        const metodo =
            recurringMethod.value;

        const estado =
            recurringStatus.value;

        const descripcion =
            recurringDescription.value
                .trim();

        if (
            !concepto ||
            !monto ||
            monto <= 0 ||
            !proximoPago
        ) {
            alert(
                "Completa correctamente los datos del recurrente."
            );

            return;
        }

        saveRecurringButton.disabled =
            true;

        saveRecurringButton.textContent =
            editingId
                ? "Guardando..."
                : "Registrando...";

        try {
            const datos = {
                concepto,
                monto,
                frecuencia,
                categoria,
                proximoPago,
                metodo,
                estado,
                descripcion,
                actualizadoEn:
                    serverTimestamp()
            };

            if (editingId) {
                await updateDoc(
                    doc(
                        db,
                        "finanzas",
                        "recurrentes",
                        "registros",
                        editingId
                    ),
                    datos
                );
            } else {
                await addDoc(
                    collection(
                        db,
                        "finanzas",
                        "recurrentes",
                        "registros"
                    ),
                    {
                        ...datos,

                        creadoEn:
                            serverTimestamp(),

                        creadoPor:
                            auth.currentUser
                                ?.uid || null,

                        origen:
                            "manual"
                    }
                );
            }

            cerrarModal();

            await cargarRecurrentes();

        } catch (error) {
            console.error(
                "Error guardando recurrente:",
                error
            );

            alert(
                "No fue posible guardar el gasto recurrente."
            );
        } finally {
            saveRecurringButton.disabled =
                false;

            saveRecurringButton.innerHTML = `
                <i data-lucide="save"></i>
                ${
                    editingId
                        ? "Guardar cambios"
                        : "Guardar recurrente"
                }
            `;

            lucide.createIcons();
        }
    }
);

async function cambiarEstado(id) {
    const item =
        recurrentes.find(
            recurrente =>
                recurrente.id === id
        );

    if (!item) {
        return;
    }

    const nuevoEstado =
        item.estado === "activo"
            ? "pausado"
            : "activo";

    try {
        await updateDoc(
            doc(
                db,
                "finanzas",
                "recurrentes",
                "registros",
                id
            ),
            {
                estado: nuevoEstado,
                actualizadoEn:
                    serverTimestamp()
            }
        );

        await cargarRecurrentes();

    } catch (error) {
        console.error(
            "Error cambiando estado:",
            error
        );

        alert(
            "No fue posible cambiar el estado."
        );
    }
}

async function eliminarRecurrente(id) {
    const item =
        recurrentes.find(
            recurrente =>
                recurrente.id === id
        );

    if (!item) {
        return;
    }

    const confirmar = window.confirm(
        `¿Eliminar "${item.concepto}" de los gastos recurrentes?\n\nEsta acción eliminará la programación, pero no eliminará movimientos financieros ya registrados.`
    );

    if (!confirmar) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "finanzas",
                "recurrentes",
                "registros",
                id
            )
        );

        await cargarRecurrentes();

    } catch (error) {
        console.error(
            "Error eliminando recurrente:",
            error
        );

        alert(
            "No fue posible eliminar el gasto recurrente."
        );
    }
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
                datos?.permisos
                    ?.finanzas !== true
            ) {
                await signOut(auth);

                redirigirLogin();

                return;
            }

            cargarUsuario(
                datos,
                usuario
            );

            await cargarRecurrentes();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error cargando recurrentes:",
                error
            );

            await signOut(auth);

            redirigirLogin();
        }
    }
);