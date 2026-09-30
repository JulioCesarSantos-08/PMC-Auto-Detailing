import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

let verificandoSesion = true;

passwordToggle.addEventListener("click", () => {
    const mostrar = passwordInput.type === "password";

    passwordInput.type = mostrar ? "text" : "password";

    passwordToggle.innerHTML = mostrar
        ? '<i data-lucide="eye-off"></i>'
        : '<i data-lucide="eye"></i>';

    passwordToggle.setAttribute(
        "aria-label",
        mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );

    lucide.createIcons();
});

function mostrarMensaje(mensaje, tipo = "error") {
    loginMessage.textContent = mensaje;
    loginMessage.className = `login-message ${tipo}`;
}

function limpiarMensaje() {
    loginMessage.textContent = "";
    loginMessage.className = "login-message";
}

function activarCarga() {
    loginButton.disabled = true;
    loginButton.classList.add("loading");
    emailInput.disabled = true;
    passwordInput.disabled = true;
}

function desactivarCarga() {
    loginButton.disabled = false;
    loginButton.classList.remove("loading");
    emailInput.disabled = false;
    passwordInput.disabled = false;
}

async function tieneAccesoFinanzas(usuario) {
    const referenciaUsuario = doc(db, "usuarios", usuario.uid);
    const documentoUsuario = await getDoc(referenciaUsuario);

    if (!documentoUsuario.exists()) {
        return false;
    }

    const datos = documentoUsuario.data();

    return datos?.permisos?.finanzas === true;
}

async function verificarUsuarioAutorizado(usuario) {
    try {
        return await tieneAccesoFinanzas(usuario);
    } catch (error) {
        console.error(error);
        return false;
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    limpiarMensaje();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
        mostrarMensaje("Ingresa tu correo electrónico y contraseña.");
        return;
    }

    activarCarga();

    try {
        const credencial = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const autorizado = await verificarUsuarioAutorizado(
            credencial.user
        );

        if (!autorizado) {
            await signOut(auth);

            mostrarMensaje(
                "Esta cuenta no tiene autorización para acceder a PMC Finanzas."
            );

            passwordInput.value = "";
            desactivarCarga();
            return;
        }

        mostrarMensaje(
            "Acceso autorizado. Ingresando al sistema...",
            "success"
        );

        setTimeout(() => {
            window.location.replace("dashboard.html");
        }, 650);

    } catch (error) {
        console.error(error);

        let mensaje = "No fue posible iniciar sesión.";

        switch (error.code) {
            case "auth/invalid-email":
                mensaje = "El correo electrónico no es válido.";
                break;

            case "auth/invalid-credential":
                mensaje = "Correo electrónico o contraseña incorrectos.";
                break;

            case "auth/user-disabled":
                mensaje = "Esta cuenta se encuentra deshabilitada.";
                break;

            case "auth/too-many-requests":
                mensaje =
                    "Se realizaron demasiados intentos. Intenta nuevamente más tarde.";
                break;

            case "auth/network-request-failed":
                mensaje =
                    "No fue posible conectar con el servidor. Revisa tu conexión.";
                break;
        }

        mostrarMensaje(mensaje);
        passwordInput.value = "";
        desactivarCarga();
    }
});

onAuthStateChanged(auth, async (usuario) => {
    if (!verificandoSesion) {
        return;
    }

    verificandoSesion = false;

    if (!usuario) {
        return;
    }

    activarCarga();

    const autorizado = await verificarUsuarioAutorizado(usuario);

    if (!autorizado) {
        await signOut(auth);
        desactivarCarga();
        return;
    }

    window.location.replace("dashboard.html");
});