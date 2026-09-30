import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const securityLoader = document.getElementById("securityLoader");
const app = document.getElementById("app");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileMenu = document.getElementById("mobileMenu");
const sidebarClose = document.getElementById("sidebarClose");

const logoutButton = document.getElementById("logoutButton");

const sidebarAvatar = document.getElementById("sidebarAvatar");
const sidebarUserName = document.getElementById("sidebarUserName");

const topbarAvatar = document.getElementById("topbarAvatar");
const topbarUserName = document.getElementById("topbarUserName");

const newGoalButton = document.getElementById("newGoalButton");
const emptyNewGoalButton = document.getElementById("emptyNewGoalButton");

const activeGoalsCount = document.getElementById("activeGoalsCount");
const completedGoalsCount = document.getElementById("completedGoalsCount");
const totalGoalsAmount = document.getElementById("totalGoalsAmount");
const generalGoalsProgress = document.getElementById("generalGoalsProgress");

const goalFilter = document.getElementById("goalFilter");
const goalsContainer = document.getElementById("goalsContainer");

const recoveryCircle = document.getElementById("recoveryCircle");
const recoveryPercentage = document.getElementById("recoveryPercentage");

const goalInitialBalance = document.getElementById("goalInitialBalance");
const goalCurrentBalance = document.getElementById("goalCurrentBalance");
const goalRecoveredCapital = document.getElementById("goalRecoveredCapital");
const goalRemainingCapital = document.getElementById("goalRemainingCapital");

const goalModal = document.getElementById("goalModal");
const goalModalBackdrop = document.getElementById("goalModalBackdrop");
const closeGoalModal = document.getElementById("closeGoalModal");
const cancelGoalButton = document.getElementById("cancelGoalButton");

const goalModalTitle = document.getElementById("goalModalTitle");
const goalForm = document.getElementById("goalForm");

const goalId = document.getElementById("goalId");
const goalName = document.getElementById("goalName");
const goalTarget = document.getElementById("goalTarget");
const goalCurrent = document.getElementById("goalCurrent");
const goalDeadline = document.getElementById("goalDeadline");
const goalCategory = document.getElementById("goalCategory");
const goalDescription = document.getElementById("goalDescription");
const saveGoalButton = document.getElementById("saveGoalButton");

const goalDeleteModal = document.getElementById("goalDeleteModal");
const goalDeleteBackdrop = document.getElementById("goalDeleteBackdrop");
const cancelDeleteGoal = document.getElementById("cancelDeleteGoal");
const confirmDeleteGoal = document.getElementById("confirmDeleteGoal");

const goalToast = document.getElementById("goalToast");
const goalToastIcon = document.getElementById("goalToastIcon");
const goalToastTitle = document.getElementById("goalToastTitle");
const goalToastMessage = document.getElementById("goalToastMessage");

let currentUser = null;
let goals = [];
let goalToDelete = null;
let toastTimer = null;

const INITIAL_BALANCE_DEFAULT = -59999.99;

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function formatMoney(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatDate(value) {
    if (!value) {
        return "Sin fecha objetivo";
    }

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Sin fecha objetivo";
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getInitials(name = "") {
    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
        return "P";
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return number;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function categoryLabel(category) {
    const categories = {
        equipo: "Equipo",
        negocio: "Negocio",
        infraestructura: "Infraestructura",
        ahorro: "Ahorro",
        expansion: "Expansión",
        otro: "Otro"
    };

    return categories[category] || "Otro";
}

function categoryIcon(category) {
    const icons = {
        equipo: "wrench",
        negocio: "briefcase-business",
        infraestructura: "building-2",
        ahorro: "piggy-bank",
        expansion: "trending-up",
        otro: "target"
    };

    return icons[category] || "target";
}

function showToast(title, message, type = "success") {
    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    goalToast.classList.remove("error");

    if (type === "error") {
        goalToast.classList.add("error");
        goalToastIcon.innerHTML = '<i data-lucide="circle-alert"></i>';
    } else {
        goalToastIcon.innerHTML = '<i data-lucide="circle-check"></i>';
    }

    goalToastTitle.textContent = title;
    goalToastMessage.textContent = message;

    goalToast.classList.add("active");

    refreshIcons();

    toastTimer = setTimeout(() => {
        goalToast.classList.remove("active");
    }, 3500);
}

function openSidebar() {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
    document.body.classList.add("sidebar-open");
}

function closeSidebarMenu() {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.classList.remove("sidebar-open");
}

function openGoalModal(goal = null) {
    goalForm.reset();

    goalId.value = "";
    goalCurrent.value = "0";
    goalCategory.value = "equipo";

    if (goal) {
        goalModalTitle.textContent = "Editar meta";

        goalId.value = goal.id;
        goalName.value = goal.nombre || "";
        goalTarget.value = normalizeNumber(goal.montoObjetivo);
        goalCurrent.value = normalizeNumber(goal.capitalActual);
        goalDeadline.value = goal.fechaObjetivo || "";
        goalCategory.value = goal.categoria || "otro";
        goalDescription.value = goal.descripcion || "";
    } else {
        goalModalTitle.textContent = "Nueva meta";
    }

    goalModal.classList.add("active");
    document.body.classList.add("modal-open");

    refreshIcons();

    setTimeout(() => {
        goalName.focus();
    }, 100);
}

function closeGoalModalWindow() {
    goalModal.classList.remove("active");
    document.body.classList.remove("modal-open");

    goalForm.reset();
    goalId.value = "";
}

function openDeleteModal(id) {
    goalToDelete = id;

    goalDeleteModal.classList.add("active");
    document.body.classList.add("modal-open");

    refreshIcons();
}

function closeDeleteModalWindow() {
    goalToDelete = null;

    goalDeleteModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function getGoalProgress(goal) {
    const target = normalizeNumber(goal.montoObjetivo);
    const current = normalizeNumber(goal.capitalActual);

    if (target <= 0) {
        return 0;
    }

    return clamp((current / target) * 100, 0, 100);
}

function isGoalCompleted(goal) {
    return getGoalProgress(goal) >= 100 || goal.estado === "completada";
}

function renderEmptyState() {
    goalsContainer.innerHTML = `
        <div class="goals-empty">
            <div class="goals-empty-icon">
                <i data-lucide="target"></i>
            </div>

            <strong>
                Aún no hay metas financieras
            </strong>

            <p>
                Crea el primer objetivo financiero de PMC Auto Detailing.
            </p>

            <button
                id="dynamicEmptyGoalButton"
                type="button"
            >
                <i data-lucide="plus"></i>
                Crear primera meta
            </button>
        </div>
    `;

    const dynamicEmptyGoalButton = document.getElementById(
        "dynamicEmptyGoalButton"
    );

    if (dynamicEmptyGoalButton) {
        dynamicEmptyGoalButton.addEventListener("click", () => {
            openGoalModal();
        });
    }

    refreshIcons();
}

function renderNoFilteredGoals() {
    goalsContainer.innerHTML = `
        <div class="goals-empty">
            <div class="goals-empty-icon">
                <i data-lucide="search-x"></i>
            </div>

            <strong>
                No hay metas en esta sección
            </strong>

            <p>
                Cambia el filtro para consultar otros objetivos financieros.
            </p>
        </div>
    `;

    refreshIcons();
}

function renderGoals() {
    if (!goals.length) {
        renderEmptyState();
        return;
    }

    const filter = goalFilter.value;

    let filteredGoals = [...goals];

    if (filter === "activas") {
        filteredGoals = filteredGoals.filter(
            goal => !isGoalCompleted(goal)
        );
    }

    if (filter === "completadas") {
        filteredGoals = filteredGoals.filter(
            goal => isGoalCompleted(goal)
        );
    }

    if (!filteredGoals.length) {
        renderNoFilteredGoals();
        return;
    }

    goalsContainer.innerHTML = filteredGoals
        .map(goal => {
            const target = normalizeNumber(goal.montoObjetivo);
            const current = normalizeNumber(goal.capitalActual);
            const progress = getGoalProgress(goal);
            const completed = isGoalCompleted(goal);
            const remaining = Math.max(target - current, 0);

            return `
                <article
                    class="goal-item ${completed ? "completed" : ""}"
                    data-id="${goal.id}"
                >
                    <div class="goal-item-top">

                        <div class="goal-item-info">

                            <div class="goal-category-icon">
                                <i data-lucide="${categoryIcon(goal.categoria)}"></i>
                            </div>

                            <div>
                                <h4>
                                    ${escapeHTML(goal.nombre || "Meta financiera")}
                                </h4>

                                <div class="goal-item-meta">

                                    <span class="goal-category">
                                        ${categoryLabel(goal.categoria)}
                                    </span>

                                    <span class="goal-date">
                                        <i data-lucide="calendar-days"></i>
                                        ${formatDate(goal.fechaObjetivo)}
                                    </span>

                                    ${
                                        completed
                                            ? `
                                                <span class="goal-completed-badge">
                                                    <i data-lucide="circle-check"></i>
                                                    Completada
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>
                            </div>

                        </div>

                        <div class="goal-actions">

                            ${
                                !completed
                                    ? `
                                        <button
                                            class="goal-action-button complete-goal"
                                            type="button"
                                            data-id="${goal.id}"
                                            title="Marcar como completada"
                                        >
                                            <i data-lucide="circle-check-big"></i>
                                        </button>
                                    `
                                    : ""
                            }

                            <button
                                class="goal-action-button edit-goal"
                                type="button"
                                data-id="${goal.id}"
                                title="Editar"
                            >
                                <i data-lucide="pencil"></i>
                            </button>

                            <button
                                class="goal-action-button delete delete-goal"
                                type="button"
                                data-id="${goal.id}"
                                title="Eliminar"
                            >
                                <i data-lucide="trash-2"></i>
                            </button>

                        </div>

                    </div>

                    ${
                        goal.descripcion
                            ? `
                                <p class="goal-description">
                                    ${escapeHTML(goal.descripcion)}
                                </p>
                            `
                            : ""
                    }

                    <div class="goal-progress-area">

                        <div class="goal-progress-header">

                            <div class="goal-progress-money">
                                <span>Progreso</span>

                                <strong>
                                    ${formatMoney(current)}
                                    de
                                    ${formatMoney(target)}
                                </strong>
                            </div>

                            <span class="goal-progress-percentage">
                                ${progress.toFixed(1)}%
                            </span>

                        </div>

                        <div class="goal-progress-bar">
                            <div
                                class="goal-progress-fill"
                                style="width: ${progress}%"
                            ></div>
                        </div>

                        <div class="goal-progress-footer">

                            <span>
                                ${
                                    completed
                                        ? "Objetivo alcanzado"
                                        : `${formatMoney(remaining)} pendientes`
                                }
                            </span>

                            <span>
                                ${
                                    goal.fechaObjetivo
                                        ? `Objetivo: ${formatDate(goal.fechaObjetivo)}`
                                        : "Sin fecha límite"
                                }
                            </span>

                        </div>

                    </div>

                </article>
            `;
        })
        .join("");

    document.querySelectorAll(".edit-goal").forEach(button => {
        button.addEventListener("click", () => {
            const goal = goals.find(
                item => item.id === button.dataset.id
            );

            if (goal) {
                openGoalModal(goal);
            }
        });
    });

    document.querySelectorAll(".delete-goal").forEach(button => {
        button.addEventListener("click", () => {
            openDeleteModal(button.dataset.id);
        });
    });

    document.querySelectorAll(".complete-goal").forEach(button => {
        button.addEventListener("click", async () => {
            await completeGoal(button.dataset.id);
        });
    });

    refreshIcons();
}

function updateSummary() {
    const active = goals.filter(
        goal => !isGoalCompleted(goal)
    );

    const completed = goals.filter(
        goal => isGoalCompleted(goal)
    );

    const activeTarget = active.reduce(
        (total, goal) =>
            total + normalizeNumber(goal.montoObjetivo),
        0
    );

    const activeCurrent = active.reduce(
        (total, goal) =>
            total +
            Math.min(
                normalizeNumber(goal.capitalActual),
                normalizeNumber(goal.montoObjetivo)
            ),
        0
    );

    let generalProgress = 0;

    if (activeTarget > 0) {
        generalProgress = clamp(
            (activeCurrent / activeTarget) * 100,
            0,
            100
        );
    } else if (goals.length && completed.length === goals.length) {
        generalProgress = 100;
    }

    activeGoalsCount.textContent = active.length;
    completedGoalsCount.textContent = completed.length;
    totalGoalsAmount.textContent = formatMoney(activeTarget);
    generalGoalsProgress.textContent =
        `${generalProgress.toFixed(1)}%`;
}

async function loadFinancialRecovery() {
    let initialBalance = INITIAL_BALANCE_DEFAULT;
    let income = 0;
    let expenses = 0;
    let investments = 0;

    try {
        const configRef = doc(
            db,
            "configuracion",
            "finanzas"
        );

        const configSnapshot = await getDoc(configRef);

        if (configSnapshot.exists()) {
            const configData = configSnapshot.data();

            if (
                configData.balanceInicial !== undefined &&
                configData.balanceInicial !== null
            ) {
                initialBalance = normalizeNumber(
                    configData.balanceInicial
                );
            }
        }
    } catch (error) {
        console.warn(
            "No se pudo leer la configuración financiera:",
            error
        );
    }

    try {
        const movementsSnapshot = await getDocs(
            collection(db, "movimientos")
        );

        movementsSnapshot.forEach(documentSnapshot => {
            const movement = documentSnapshot.data();

            const amount = Math.abs(
                normalizeNumber(movement.monto)
            );

            const type = String(
                movement.tipo || ""
            ).toLowerCase();

            if (type === "ingreso") {
                income += amount;
            }

            if (type === "egreso") {
                expenses += amount;
            }

            if (type === "inversion") {
                investments += amount;
            }
        });
    } catch (error) {
        console.error(
            "Error leyendo movimientos:",
            error
        );
    }

    const currentBalance =
        initialBalance +
        income -
        expenses -
        investments;

    const initialCapital = Math.abs(
        Math.min(initialBalance, 0)
    );

    let recoveredCapital = 0;
    let remainingCapital = 0;
    let percentage = 0;

    if (initialCapital > 0) {
        recoveredCapital = clamp(
            initialCapital -
            Math.abs(Math.min(currentBalance, 0)),
            0,
            initialCapital
        );

        if (currentBalance >= 0) {
            recoveredCapital = initialCapital;
        }

        remainingCapital = Math.max(
            initialCapital - recoveredCapital,
            0
        );

        percentage = clamp(
            (recoveredCapital / initialCapital) * 100,
            0,
            100
        );
    }

    goalInitialBalance.textContent =
        formatMoney(initialBalance);

    goalCurrentBalance.textContent =
        formatMoney(currentBalance);

    goalRecoveredCapital.textContent =
        formatMoney(recoveredCapital);

    goalRemainingCapital.textContent =
        formatMoney(remainingCapital);

    recoveryPercentage.textContent =
        `${percentage.toFixed(1)}%`;

    const circumference = 326.73;

    const offset =
        circumference -
        (percentage / 100) * circumference;

    recoveryCircle.style.strokeDashoffset = offset;
}

async function loadGoals() {
    try {
        let snapshot;

        try {
            const goalsQuery = query(
                collection(db, "metas"),
                orderBy("creadoEn", "desc")
            );

            snapshot = await getDocs(goalsQuery);
        } catch (queryError) {
            snapshot = await getDocs(
                collection(db, "metas")
            );
        }

        goals = snapshot.docs.map(documentSnapshot => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        }));

        updateSummary();
        renderGoals();
    } catch (error) {
        console.error(
            "Error cargando metas:",
            error
        );

        showToast(
            "No se pudieron cargar las metas",
            "Revisa la conexión con Firestore.",
            "error"
        );

        goals = [];
        updateSummary();
        renderGoals();
    }
}

async function saveGoal(event) {
    event.preventDefault();

    const name = goalName.value.trim();
    const target = normalizeNumber(goalTarget.value);
    const current = normalizeNumber(goalCurrent.value);
    const deadline = goalDeadline.value;
    const category = goalCategory.value;
    const description = goalDescription.value.trim();

    if (!name) {
        showToast(
            "Nombre requerido",
            "Escribe un nombre para la meta.",
            "error"
        );

        goalName.focus();
        return;
    }

    if (target <= 0) {
        showToast(
            "Monto inválido",
            "El monto objetivo debe ser mayor a cero.",
            "error"
        );

        goalTarget.focus();
        return;
    }

    if (current < 0) {
        showToast(
            "Capital inválido",
            "El capital actual no puede ser negativo.",
            "error"
        );

        goalCurrent.focus();
        return;
    }

    saveGoalButton.disabled = true;

    const originalButtonContent =
        saveGoalButton.innerHTML;

    saveGoalButton.innerHTML = `
        <i data-lucide="loader-circle"></i>
        Guardando...
    `;

    refreshIcons();

    try {
        const completed = current >= target;

        const data = {
            nombre: name,
            montoObjetivo: target,
            capitalActual: current,
            fechaObjetivo: deadline || "",
            categoria: category,
            descripcion: description,
            estado: completed ? "completada" : "activa",
            actualizadoEn: serverTimestamp(),
            actualizadoPor: currentUser.uid
        };

        if (goalId.value) {
            const reference = doc(
                db,
                "metas",
                goalId.value
            );

            await updateDoc(reference, data);

            showToast(
                "Meta actualizada",
                "Los cambios fueron guardados correctamente."
            );
        } else {
            await addDoc(
                collection(db, "metas"),
                {
                    ...data,
                    creadoEn: serverTimestamp(),
                    creadoPor: currentUser.uid
                }
            );

            showToast(
                "Meta creada",
                "El nuevo objetivo financiero fue registrado."
            );
        }

        closeGoalModalWindow();

        await loadGoals();
    } catch (error) {
        console.error(
            "Error guardando meta:",
            error
        );

        showToast(
            "No se pudo guardar",
            "Ocurrió un problema al registrar la meta.",
            "error"
        );
    } finally {
        saveGoalButton.disabled = false;
        saveGoalButton.innerHTML = originalButtonContent;

        refreshIcons();
    }
}

async function completeGoal(id) {
    const goal = goals.find(
        item => item.id === id
    );

    if (!goal) {
        return;
    }

    try {
        const reference = doc(
            db,
            "metas",
            id
        );

        await updateDoc(reference, {
            capitalActual: normalizeNumber(
                goal.montoObjetivo
            ),
            estado: "completada",
            completadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp(),
            actualizadoPor: currentUser.uid
        });

        showToast(
            "Meta completada",
            "El objetivo fue marcado como alcanzado."
        );

        await loadGoals();
    } catch (error) {
        console.error(
            "Error completando meta:",
            error
        );

        showToast(
            "No se pudo actualizar",
            "Ocurrió un problema al completar la meta.",
            "error"
        );
    }
}

async function deleteGoal() {
    if (!goalToDelete) {
        return;
    }

    confirmDeleteGoal.disabled = true;
    confirmDeleteGoal.textContent = "Eliminando...";

    try {
        await deleteDoc(
            doc(
                db,
                "metas",
                goalToDelete
            )
        );

        closeDeleteModalWindow();

        showToast(
            "Meta eliminada",
            "El objetivo financiero fue eliminado correctamente."
        );

        await loadGoals();
    } catch (error) {
        console.error(
            "Error eliminando meta:",
            error
        );

        showToast(
            "No se pudo eliminar",
            "Ocurrió un problema al eliminar la meta.",
            "error"
        );
    } finally {
        confirmDeleteGoal.disabled = false;
        confirmDeleteGoal.textContent = "Eliminar";
    }
}

async function verifyFinancialAccess(user) {
    try {
        const userReference = doc(
            db,
            "usuarios",
            user.uid
        );

        const userSnapshot = await getDoc(
            userReference
        );

        if (!userSnapshot.exists()) {
            await signOut(auth);
            window.location.replace("index.html");
            return false;
        }

        const data = userSnapshot.data();

        if (
            !data.permisos ||
            data.permisos.finanzas !== true
        ) {
            await signOut(auth);
            window.location.replace("index.html");
            return false;
        }

        const displayName =
            data.nombre ||
            user.displayName ||
            user.email ||
            "Usuario";

        const initials = getInitials(displayName);

        sidebarUserName.textContent = displayName;
        topbarUserName.textContent = displayName;

        sidebarAvatar.textContent = initials;
        topbarAvatar.textContent = initials;

        return true;
    } catch (error) {
        console.error(
            "Error verificando acceso:",
            error
        );

        await signOut(auth);
        window.location.replace("index.html");

        return false;
    }
}

if (mobileMenu) {
    mobileMenu.addEventListener(
        "click",
        openSidebar
    );
}

if (sidebarClose) {
    sidebarClose.addEventListener(
        "click",
        closeSidebarMenu
    );
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener(
        "click",
        closeSidebarMenu
    );
}

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        async () => {
            try {
                await signOut(auth);
                window.location.replace("index.html");
            } catch (error) {
                console.error(
                    "Error cerrando sesión:",
                    error
                );
            }
        }
    );
}

if (newGoalButton) {
    newGoalButton.addEventListener(
        "click",
        () => openGoalModal()
    );
}

if (emptyNewGoalButton) {
    emptyNewGoalButton.addEventListener(
        "click",
        () => openGoalModal()
    );
}

closeGoalModal.addEventListener(
    "click",
    closeGoalModalWindow
);

cancelGoalButton.addEventListener(
    "click",
    closeGoalModalWindow
);

goalModalBackdrop.addEventListener(
    "click",
    closeGoalModalWindow
);

goalDeleteBackdrop.addEventListener(
    "click",
    closeDeleteModalWindow
);

cancelDeleteGoal.addEventListener(
    "click",
    closeDeleteModalWindow
);

confirmDeleteGoal.addEventListener(
    "click",
    deleteGoal
);

goalForm.addEventListener(
    "submit",
    saveGoal
);

goalFilter.addEventListener(
    "change",
    renderGoals
);

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") {
            return;
        }

        if (goalDeleteModal.classList.contains("active")) {
            closeDeleteModalWindow();
            return;
        }

        if (goalModal.classList.contains("active")) {
            closeGoalModalWindow();
        }
    }
);

onAuthStateChanged(
    auth,
    async user => {
        if (!user) {
            window.location.replace("index.html");
            return;
        }

        currentUser = user;

        const hasAccess =
            await verifyFinancialAccess(user);

        if (!hasAccess) {
            return;
        }

        securityLoader.classList.add("hidden");
        app.classList.remove("hidden");

        refreshIcons();

        await Promise.all([
            loadGoals(),
            loadFinancialRecovery()
        ]);
    }
);

refreshIcons();