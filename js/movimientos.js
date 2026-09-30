import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
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

const newMovementButton = document.getElementById("newMovementButton");
const emptyNewMovement = document.getElementById("emptyNewMovement");

const movementFormModal = document.getElementById("movementFormModal");
const movementModalBackdrop = document.getElementById("movementModalBackdrop");
const closeMovementModal = document.getElementById("closeMovementModal");
const cancelMovement = document.getElementById("cancelMovement");

const movementForm = document.getElementById("movementForm");

const movementType = document.getElementById("movementType");
const movementConcept = document.getElementById("movementConcept");
const movementAmount = document.getElementById("movementAmount");
const movementDate = document.getElementById("movementDate");
const movementCategory = document.getElementById("movementCategory");
const movementMethod = document.getElementById("movementMethod");
const movementDescription = document.getElementById("movementDescription");

const movementMessage = document.getElementById("movementMessage");
const saveMovement = document.getElementById("saveMovement");

const movementSearch = document.getElementById("movementSearch");
const typeFilter = document.getElementById("typeFilter");
const dateFilter = document.getElementById("dateFilter");

const movementsTableBody = document.getElementById("movementsTableBody");
const movementsEmpty = document.getElementById("movementsEmpty");

const totalIncome = document.getElementById("totalIncome");
const totalExpenses = document.getElementById("totalExpenses");
const totalInvestments = document.getElementById("totalInvestments");
const netMovement = document.getElementById("netMovement");

const movementTypeButtons = document.querySelectorAll(".movement-type");

let usuarioActual = null;
let datosUsuarioActual = null;
let movimientos = [];

const categorias = {
    ingreso: [
        "Servicios",
        "Venta de productos",
        "Paquetes",
        "Anticipo",
        "Otros ingresos"
    ],

    egreso: [
        "Productos e insumos",
        "Herramientas",
        "Mantenimiento",
        "Renta",
        "Servicios",
        "Publicidad",
        "Transporte",
        "Nómina",
        "Impuestos",
        "Comisiones",
        "Otros egresos"
    ],

    inversion: [
        "Equipo",
        "Herramientas",
        "Infraestructura",
        "Mobiliario",
        "Tecnología",
        "Adecuación del local",
        "Capital adicional",
        "Otra inversión"
    ]
};

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

function mostrarAplicacion() {
    securityLoader.classList.add("hidden");
    app.classList.remove("hidden");

    if (window.lucide) {
        lucide.createIcons();
    }
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

window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
        cerrarSidebar();
    }
});

logoutButton?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        redirigirLogin();
    } catch (error) {
        console.error(error);
    }
});

function obtenerFechaLocal() {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function abrirModal() {
    movementFormModal.classList.add("active");

    movementFormModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";

    if (!movementDate.value) {
        movementDate.value = obtenerFechaLocal();
    }

    movementConcept.focus();

    if (window.lucide) {
        lucide.createIcons();
    }
}

function cerrarModal() {
    movementFormModal.classList.remove("active");

    movementFormModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    limpiarMensaje();
}

newMovementButton?.addEventListener(
    "click",
    abrirModal
);

emptyNewMovement?.addEventListener(
    "click",
    abrirModal
);

closeMovementModal?.addEventListener(
    "click",
    cerrarModal
);

cancelMovement?.addEventListener(
    "click",
    cerrarModal
);

movementModalBackdrop?.addEventListener(
    "click",
    cerrarModal
);

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            movementFormModal.classList.contains("active")
        ) {
            cerrarModal();
        }
    }
);

function seleccionarTipo(tipo) {
    movementType.value = tipo;

    movementTypeButtons.forEach((boton) => {
        boton.classList.toggle(
            "active",
            boton.dataset.type === tipo
        );
    });

    cargarCategorias(tipo);
}

movementTypeButtons.forEach((boton) => {
    boton.addEventListener("click", () => {
        seleccionarTipo(
            boton.dataset.type
        );
    });
});

function cargarCategorias(tipo) {
    const lista = categorias[tipo] || [];

    movementCategory.innerHTML = "";

    lista.forEach((categoria) => {
        const option = document.createElement("option");

        option.value = categoria;
        option.textContent = categoria;

        movementCategory.appendChild(option);
    });
}

function mostrarMensaje(texto, tipo) {
    movementMessage.textContent = texto;
    movementMessage.className =
        `movement-message ${tipo}`;
}

function limpiarMensaje() {
    movementMessage.textContent = "";
    movementMessage.className =
        "movement-message";
}

function activarGuardado() {
    saveMovement.disabled = true;
    saveMovement.classList.add("loading");
}

function desactivarGuardado() {
    saveMovement.disabled = false;
    saveMovement.classList.remove("loading");
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
    ).format(Number(valor) || 0);
}

function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
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

function formatearMetodo(metodo) {
    const nombres = {
        efectivo: "Efectivo",
        transferencia: "Transferencia",
        tarjeta: "Tarjeta",
        otro: "Otro"
    };

    return nombres[metodo] || capitalizar(metodo);
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

function formatearFecha(movimiento) {
    const fecha =
        obtenerFechaMovimiento(movimiento);

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

function obtenerIconoTipo(tipo) {
    if (tipo === "ingreso") {
        return "arrow-up-right";
    }

    if (tipo === "egreso") {
        return "arrow-down-right";
    }

    return "landmark";
}

function obtenerSigno(tipo) {
    return tipo === "ingreso"
        ? "+"
        : "-";
}

function ordenarMovimientos(lista) {
    return [...lista].sort((a, b) => {
        const fechaA =
            obtenerFechaMovimiento(a)?.getTime() || 0;

        const fechaB =
            obtenerFechaMovimiento(b)?.getTime() || 0;

        if (fechaB !== fechaA) {
            return fechaB - fechaA;
        }

        const creadoA =
            a?.creadoEn?.toMillis?.() || 0;

        const creadoB =
            b?.creadoEn?.toMillis?.() || 0;

        return creadoB - creadoA;
    });
}

async function cargarMovimientos() {
    try {
        const referencia = collection(
            db,
            "finanzas",
            "movimientos",
            "registros"
        );

        const snapshot =
            await getDocs(referencia);

        movimientos =
            snapshot.docs.map(
                (documento) => ({
                    id: documento.id,
                    ...documento.data()
                })
            );

        movimientos =
            ordenarMovimientos(movimientos);

        actualizarResumen();
        aplicarFiltros();

    } catch (error) {
        console.error(
            "Error cargando movimientos:",
            error
        );
    }
}

function actualizarResumen() {
    let ingresos = 0;
    let egresos = 0;
    let inversiones = 0;

    movimientos.forEach((movimiento) => {
        if (movimiento.estado === "cancelado") {
            return;
        }

        const monto =
            Math.abs(
                Number(movimiento.monto) || 0
            );

        if (movimiento.tipo === "ingreso") {
            ingresos += monto;
        }

        if (movimiento.tipo === "egreso") {
            egresos += monto;
        }

        if (movimiento.tipo === "inversion") {
            inversiones += monto;
        }
    });

    const impacto =
        ingresos -
        egresos -
        inversiones;

    totalIncome.textContent =
        formatearMoneda(ingresos);

    totalExpenses.textContent =
        formatearMoneda(egresos);

    totalInvestments.textContent =
        formatearMoneda(inversiones);

    netMovement.textContent =
        formatearMoneda(impacto);
}

function coincideFecha(
    movimiento,
    filtro
) {
    if (filtro === "all") {
        return true;
    }

    const fecha =
        obtenerFechaMovimiento(movimiento);

    if (!fecha) {
        return false;
    }

    const hoy = new Date();

    if (filtro === "month") {
        return (
            fecha.getMonth() ===
                hoy.getMonth() &&
            fecha.getFullYear() ===
                hoy.getFullYear()
        );
    }

    if (filtro === "previous") {
        const anterior = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - 1,
            1
        );

        return (
            fecha.getMonth() ===
                anterior.getMonth() &&
            fecha.getFullYear() ===
                anterior.getFullYear()
        );
    }

    if (filtro === "year") {
        return (
            fecha.getFullYear() ===
            hoy.getFullYear()
        );
    }

    return true;
}

function aplicarFiltros() {
    const busqueda =
        movementSearch.value
            .trim()
            .toLowerCase();

    const tipo =
        typeFilter.value;

    const fecha =
        dateFilter.value;

    const filtrados =
        movimientos.filter(
            (movimiento) => {
                if (
                    movimiento.estado === "cancelado"
                ) {
                    return false;
                }

                const coincideTipo =
                    tipo === "all" ||
                    movimiento.tipo === tipo;

                if (!coincideTipo) {
                    return false;
                }

                if (
                    !coincideFecha(
                        movimiento,
                        fecha
                    )
                ) {
                    return false;
                }

                if (!busqueda) {
                    return true;
                }

                const contenido = [
                    movimiento.concepto,
                    movimiento.descripcion,
                    movimiento.categoria,
                    movimiento.metodo,
                    movimiento.tipo
                ]
                    .join(" ")
                    .toLowerCase();

                return contenido.includes(
                    busqueda
                );
            }
        );

    renderizarMovimientos(filtrados);
}

movementSearch.addEventListener(
    "input",
    aplicarFiltros
);

typeFilter.addEventListener(
    "change",
    aplicarFiltros
);

dateFilter.addEventListener(
    "change",
    aplicarFiltros
);

function renderizarMovimientos(lista) {
    movementsTableBody.innerHTML = "";

    if (!lista.length) {
        movementsEmpty.classList.remove(
            "hidden"
        );

        return;
    }

    movementsEmpty.classList.add("hidden");

    lista.forEach((movimiento) => {
        const tipo =
            movimiento.tipo;

        const monto =
            Math.abs(
                Number(movimiento.monto) || 0
            );

        const fila =
            document.createElement("tr");

        fila.innerHTML = `
            <td>
                <div class="movement-name">

                    <div class="table-movement-icon ${tipo}">
                        <i data-lucide="${obtenerIconoTipo(tipo)}"></i>
                    </div>

                    <div>
                        <strong>
                            ${escaparHTML(
                                movimiento.concepto ||
                                "Sin concepto"
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                movimiento.descripcion ||
                                "Sin descripción"
                            )}
                        </span>
                    </div>

                </div>
            </td>

            <td>
                <span class="type-badge ${tipo}">
                    ${capitalizar(tipo)}
                </span>
            </td>

            <td>
                ${escaparHTML(
                    movimiento.categoria ||
                    "Sin categoría"
                )}
            </td>

            <td>
                ${formatearFecha(movimiento)}
            </td>

            <td>
                ${escaparHTML(
                    formatearMetodo(
                        movimiento.metodo
                    )
                )}
            </td>

            <td>
                <strong class="table-amount ${tipo}">
                    ${obtenerSigno(tipo)}
                    ${formatearMoneda(monto)}
                </strong>
            </td>

            <td class="table-actions">

                <button
                    type="button"
                    class="table-action-button"
                    title="Detalles"
                    data-id="${movimiento.id}"
                >
                    <i data-lucide="more-horizontal"></i>
                </button>

            </td>
        `;

        movementsTableBody.appendChild(
            fila
        );
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

function limpiarFormulario() {
    movementForm.reset();

    movementType.value = "ingreso";

    seleccionarTipo("ingreso");

    movementDate.value =
        obtenerFechaLocal();

    movementMethod.value =
        "efectivo";

    limpiarMensaje();
}

movementForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        limpiarMensaje();

        if (!usuarioActual) {
            mostrarMensaje(
                "La sesión no está disponible.",
                "error"
            );

            return;
        }

        const tipo =
            movementType.value;

        const concepto =
            movementConcept.value.trim();

        const monto =
            Math.abs(
                Number(
                    movementAmount.value
                )
            );

        const fecha =
            movementDate.value;

        const categoria =
            movementCategory.value;

        const metodo =
            movementMethod.value;

        const descripcion =
            movementDescription.value.trim();

        if (
            !["ingreso", "egreso", "inversion"]
                .includes(tipo)
        ) {
            mostrarMensaje(
                "Selecciona un tipo de movimiento válido.",
                "error"
            );

            return;
        }

        if (!concepto) {
            mostrarMensaje(
                "Escribe el concepto del movimiento.",
                "error"
            );

            return;
        }

        if (
            !Number.isFinite(monto) ||
            monto <= 0
        ) {
            mostrarMensaje(
                "Ingresa un monto válido.",
                "error"
            );

            return;
        }

        if (!fecha) {
            mostrarMensaje(
                "Selecciona la fecha del movimiento.",
                "error"
            );

            return;
        }

        if (!categoria) {
            mostrarMensaje(
                "Selecciona una categoría.",
                "error"
            );

            return;
        }

        activarGuardado();

        try {
            const referencia = collection(
                db,
                "finanzas",
                "movimientos",
                "registros"
            );

            await addDoc(
                referencia,
                {
                    tipo,
                    concepto,
                    monto,
                    fecha,
                    categoria,
                    metodo,
                    descripcion,

                    moneda: "MXN",

                    origen: "manual",

                    estado: "activo",

                    creadoPor:
                        usuarioActual.uid,

                    creadoPorEmail:
                        usuarioActual.email || "",

                    creadoPorNombre:
                        datosUsuarioActual?.nombre ||
                        usuarioActual.displayName ||
                        "",

                    creadoEn:
                        serverTimestamp(),

                    actualizadoEn:
                        serverTimestamp()
                }
            );

            mostrarMensaje(
                "Movimiento registrado correctamente.",
                "success"
            );

            await cargarMovimientos();

            setTimeout(() => {
                cerrarModal();
                limpiarFormulario();
            }, 700);

        } catch (error) {
            console.error(
                "Error registrando movimiento:",
                error
            );

            mostrarMensaje(
                "No fue posible registrar el movimiento.",
                "error"
            );

        } finally {
            desactivarGuardado();
        }
    }
);

onAuthStateChanged(
    auth,
    async (usuario) => {
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
                datos?.permisos?.finanzas !== true
            ) {
                await signOut(auth);
                redirigirLogin();
                return;
            }

            usuarioActual = usuario;
            datosUsuarioActual = datos;

            cargarUsuario(
                datos,
                usuario
            );

            seleccionarTipo("ingreso");

            movementDate.value =
                obtenerFechaLocal();

            await cargarMovimientos();

            mostrarAplicacion();

        } catch (error) {
            console.error(
                "Error verificando acceso:",
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
);