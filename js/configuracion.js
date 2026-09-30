import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
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

const financialConfigForm =
    document.getElementById("financialConfigForm");

const initialInvestment =
    document.getElementById("initialInvestment");

const startDate =
    document.getElementById("startDate");

const currency =
    document.getElementById("currency");

const previewBalance =
    document.getElementById("previewBalance");

const configMessage =
    document.getElementById("configMessage");

const saveSettingsButton =
    document.getElementById("saveSettingsButton");

let usuarioActual = null;

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
    document.body.style.overflow = "hidden";
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

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(valor) || 0);
}

function actualizarVistaPrevia() {
    const monto =
        Math.abs(
            Number(initialInvestment.value) || 0
        );

    previewBalance.textContent =
        formatearMoneda(-monto);
}

initialInvestment.addEventListener(
    "input",
    actualizarVistaPrevia
);

function mostrarMensaje(texto, tipo) {
    configMessage.textContent = texto;
    configMessage.className =
        `config-message ${tipo}`;
}

function activarCarga() {
    saveSettingsButton.disabled = true;
    saveSettingsButton.classList.add("loading");
}

function desactivarCarga() {
    saveSettingsButton.disabled = false;
    saveSettingsButton.classList.remove("loading");
}

async function cargarConfiguracion() {
    const referencia = doc(
        db,
        "finanzas",
        "configuracion"
    );

    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
        const hoy = new Date();
        const fechaLocal = [
            hoy.getFullYear(),
            String(hoy.getMonth() + 1).padStart(2, "0"),
            String(hoy.getDate()).padStart(2, "0")
        ].join("-");

        startDate.value = fechaLocal;
        actualizarVistaPrevia();
        return;
    }

    const datos = snapshot.data();

    initialInvestment.value =
        Number(datos.inversionInicial || 0);

    startDate.value =
        datos.fechaInicio || "";

    currency.value =
        datos.moneda || "MXN";

    actualizarVistaPrevia();
}

financialConfigForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const inversion =
            Math.abs(
                Number(initialInvestment.value)
            );

        const fecha = startDate.value;

        if (!inversion || inversion <= 0) {
            mostrarMensaje(
                "Ingresa una inversión inicial válida.",
                "error"
            );
            return;
        }

        if (!fecha) {
            mostrarMensaje(
                "Selecciona la fecha de inicio.",
                "error"
            );
            return;
        }

        activarCarga();

        try {
            const referencia = doc(
                db,
                "finanzas",
                "configuracion"
            );

            await setDoc(
                referencia,
                {
                    inversionInicial: inversion,
                    balanceInicial: -inversion,
                    fechaInicio: fecha,
                    moneda: currency.value,
                    actualizadoPor:
                        usuarioActual.uid,
                    actualizadoEn:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );

            mostrarMensaje(
                "Configuración financiera guardada correctamente.",
                "success"
            );

            actualizarVistaPrevia();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible guardar la configuración.",
                "error"
            );
        } finally {
            desactivarCarga();
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
                await obtenerUsuario(usuario);

            if (
                !datos ||
                datos?.permisos?.finanzas !== true
            ) {
                await signOut(auth);
                redirigirLogin();
                return;
            }

            usuarioActual = usuario;

            cargarUsuario(
                datos,
                usuario
            );

            await cargarConfiguracion();

            mostrarAplicacion();

        } catch (error) {
            console.error(error);

            await signOut(auth);
            redirigirLogin();
        }
    }
);