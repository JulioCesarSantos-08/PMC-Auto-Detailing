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
    getDocs,
    doc,
    getDoc
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

const reportPeriod = document.getElementById("reportPeriod");
const customDateFields = document.getElementById("customDateFields");
const reportStartDate = document.getElementById("reportStartDate");
const reportEndDate = document.getElementById("reportEndDate");
const applyReportFilter = document.getElementById("applyReportFilter");

const exportExcelButton = document.getElementById("exportExcelButton");
const exportPdfButton = document.getElementById("exportPdfButton");

const reportGeneratedAt = document.getElementById("reportGeneratedAt");

const reportIncome = document.getElementById("reportIncome");
const reportExpenses = document.getElementById("reportExpenses");
const reportInvestments = document.getElementById("reportInvestments");
const reportNetFlow = document.getElementById("reportNetFlow");

const reportIncomeCount = document.getElementById("reportIncomeCount");
const reportExpensesCount = document.getElementById("reportExpensesCount");
const reportInvestmentsCount = document.getElementById("reportInvestmentsCount");

const reportInitialBalance = document.getElementById("reportInitialBalance");
const reportCurrentBalance = document.getElementById("reportCurrentBalance");
const reportRecurringMonthly = document.getElementById("reportRecurringMonthly");
const reportMovementCount = document.getElementById("reportMovementCount");

const distributionIncome = document.getElementById("distributionIncome");
const distributionExpenses = document.getElementById("distributionExpenses");
const distributionInvestments = document.getElementById("distributionInvestments");

const reportCategoriesContainer = document.getElementById(
    "reportCategoriesContainer"
);

const reportMovementsTable = document.getElementById(
    "reportMovementsTable"
);

const reportPeriodLabel = document.getElementById("reportPeriodLabel");

const reportToast = document.getElementById("reportToast");
const reportToastIcon = document.getElementById("reportToastIcon");
const reportToastTitle = document.getElementById("reportToastTitle");
const reportToastMessage = document.getElementById("reportToastMessage");

let currentUser = null;

let allMovements = [];
let filteredMovements = [];
let recurringItems = [];

let initialBalance = -59999.99;
let currentBalance = -59999.99;

let currentPeriodStart = null;
let currentPeriodEnd = null;

let flowChart = null;
let distributionChart = null;

let toastTimer = null;

const DEFAULT_INITIAL_BALANCE = -59999.99;

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function normalizeNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return number;
}

function formatMoney(value) {
    const number = normalizeNumber(value);

    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "--";
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function formatDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "--";
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatInputDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseInputDate(value, endOfDay = false) {
    if (!value) {
        return null;
    }

    const parts = value.split("-").map(Number);

    if (parts.length !== 3) {
        return null;
    }

    const [year, month, day] = parts;

    const date = new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
    );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function convertToDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value?.toDate === "function") {
        return value.toDate();
    }

    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {
        return new Date(value.seconds * 1000);
    }

    if (typeof value === "number") {
        const date = new Date(value);

        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }

    if (typeof value === "string") {
        const directDate = new Date(value);

        if (!Number.isNaN(directDate.getTime())) {
            return directDate;
        }

        const match = value.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (match) {
            const date = new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }
    }

    return null;
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

function normalizeType(value) {
    const type = String(value || "")
        .trim()
        .toLowerCase();

    if (
        type === "ingreso" ||
        type === "entrada"
    ) {
        return "ingreso";
    }

    if (
        type === "egreso" ||
        type === "gasto" ||
        type === "salida"
    ) {
        return "egreso";
    }

    if (
        type === "inversion" ||
        type === "inversión"
    ) {
        return "inversion";
    }

    return type;
}

function getMovementAmount(movement) {
    return Math.abs(
        normalizeNumber(
            movement.monto ??
            movement.cantidad ??
            movement.importe ??
            0
        )
    );
}

function getMovementDate(movement) {
    return convertToDate(
        movement.fecha ??
        movement.fechaMovimiento ??
        movement.creadoEn ??
        movement.createdAt ??
        null
    );
}

function getMovementConcept(movement) {
    return (
        movement.concepto ||
        movement.descripcion ||
        movement.nombre ||
        movement.detalle ||
        "Movimiento financiero"
    );
}

function getMovementCategory(movement) {
    const category =
        movement.categoria ||
        movement.category ||
        movement.tipoCategoria ||
        "";

    if (category) {
        return String(category);
    }

    const type = normalizeType(movement.tipo);

    if (type === "ingreso") {
        return "Ingresos";
    }

    if (type === "egreso") {
        return "Egresos";
    }

    if (type === "inversion") {
        return "Inversiones";
    }

    return "Otros";
}

function showToast(title, message, type = "success") {
    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    reportToast.classList.remove("error");

    if (type === "error") {
        reportToast.classList.add("error");

        reportToastIcon.innerHTML = `
            <i data-lucide="circle-alert"></i>
        `;
    } else {
        reportToastIcon.innerHTML = `
            <i data-lucide="circle-check"></i>
        `;
    }

    reportToastTitle.textContent = title;
    reportToastMessage.textContent = message;

    reportToast.classList.add("active");

    refreshIcons();

    toastTimer = setTimeout(() => {
        reportToast.classList.remove("active");
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

function normalizeFrequencyToMonthly(item) {
    const amount = Math.abs(
        normalizeNumber(item.monto)
    );

    const frequency = String(
        item.frecuencia || "mensual"
    )
        .trim()
        .toLowerCase();

    if (
        frequency === "semanal" ||
        frequency === "semana"
    ) {
        return amount * 52 / 12;
    }

    if (
        frequency === "quincenal" ||
        frequency === "quincena"
    ) {
        return amount * 2;
    }

    if (
        frequency === "bimestral" ||
        frequency === "bimensual"
    ) {
        return amount / 2;
    }

    if (
        frequency === "trimestral" ||
        frequency === "trimestre"
    ) {
        return amount / 3;
    }

    if (
        frequency === "semestral" ||
        frequency === "semestre"
    ) {
        return amount / 6;
    }

    if (
        frequency === "anual" ||
        frequency === "año"
    ) {
        return amount / 12;
    }

    return amount;
}

function getRecurringMonthlyTotal() {
    return recurringItems
        .filter(item => {
            const status = String(
                item.estado || "activo"
            )
                .trim()
                .toLowerCase();

            return status === "activo";
        })
        .reduce(
            (total, item) =>
                total + normalizeFrequencyToMonthly(item),
            0
        );
}

async function loadInitialBalance() {
    initialBalance = DEFAULT_INITIAL_BALANCE;

    const references = [
        doc(db, "finanzas", "configuracion"),
        doc(db, "configuracion", "finanzas")
    ];

    for (const reference of references) {
        try {
            const snapshot = await getDoc(reference);

            if (!snapshot.exists()) {
                continue;
            }

            const data = snapshot.data();

            const candidates = [
                data.balanceInicial,
                data.inversionInicial,
                data.capitalInicial,
                data.saldoInicial,
                data.balance_inicial
            ];

            const validValue = candidates.find(
                value =>
                    value !== undefined &&
                    value !== null &&
                    Number.isFinite(Number(value))
            );

            if (validValue !== undefined) {
                initialBalance = Number(validValue);
                return;
            }
        } catch (error) {
            console.warn(
                "No se pudo leer una configuración financiera:",
                error
            );
        }
    }
}

async function loadMovements() {
    try {
        const snapshot = await getDocs(
            collection(
                db,
                "finanzas",
                "movimientos",
                "registros"
            )
        );

        allMovements = snapshot.docs
            .map(documentSnapshot => {
                const data = documentSnapshot.data();

                return {
                    id: documentSnapshot.id,
                    ...data,
                    _date: getMovementDate(data),
                    _type: normalizeType(data.tipo),
                    _amount: getMovementAmount(data)
                };
            })
            .filter(movement => movement._date)
            .sort(
                (a, b) =>
                    b._date.getTime() -
                    a._date.getTime()
            );
    } catch (error) {
        console.error(
            "Error cargando movimientos:",
            error
        );

        allMovements = [];

        showToast(
            "Error de movimientos",
            "No se pudieron cargar los movimientos financieros.",
            "error"
        );
    }
}

async function loadRecurring() {
    try {
        const snapshot = await getDocs(
            collection(
                db,
                "finanzas",
                "recurrentes",
                "registros"
            )
        );

        recurringItems = snapshot.docs.map(
            documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            })
        );
    } catch (error) {
        console.error(
            "Error cargando recurrentes:",
            error
        );

        recurringItems = [];
    }
}

function calculateCurrentBalance() {
    const movementFlow = allMovements.reduce(
        (total, movement) => {
            if (movement._type === "ingreso") {
                return total + movement._amount;
            }

            if (
                movement._type === "egreso" ||
                movement._type === "inversion"
            ) {
                return total - movement._amount;
            }

            return total;
        },
        0
    );

    currentBalance =
        initialBalance +
        movementFlow;
}

function startOfMonth(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0,
        0
    );
}

function endOfMonth(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
    );
}

function getPeriodRange(period) {
    const now = new Date();

    if (period === "current-month") {
        return {
            start: startOfMonth(now),
            end: endOfMonth(now),
            label: "Este mes"
        };
    }

    if (period === "previous-month") {
        const previousMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

        return {
            start: startOfMonth(previousMonth),
            end: endOfMonth(previousMonth),
            label: "Mes anterior"
        };
    }

    if (period === "3-months") {
        const start = new Date(
            now.getFullYear(),
            now.getMonth() - 2,
            1
        );

        return {
            start: startOfMonth(start),
            end: endOfMonth(now),
            label: "Últimos 3 meses"
        };
    }

    if (period === "6-months") {
        const start = new Date(
            now.getFullYear(),
            now.getMonth() - 5,
            1
        );

        return {
            start: startOfMonth(start),
            end: endOfMonth(now),
            label: "Últimos 6 meses"
        };
    }

    if (period === "12-months") {
        const start = new Date(
            now.getFullYear(),
            now.getMonth() - 11,
            1
        );

        return {
            start: startOfMonth(start),
            end: endOfMonth(now),
            label: "Últimos 12 meses"
        };
    }

    if (period === "all") {
        if (!allMovements.length) {
            return {
                start: null,
                end: null,
                label: "Todo el historial"
            };
        }

        const dates = allMovements
            .map(movement => movement._date)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    a.getTime() -
                    b.getTime()
            );

        return {
            start: dates[0] || null,
            end: dates[dates.length - 1] || null,
            label: "Todo el historial"
        };
    }

    if (period === "custom") {
        const start = parseInputDate(
            reportStartDate.value
        );

        const end = parseInputDate(
            reportEndDate.value,
            true
        );

        return {
            start,
            end,
            label:
                start && end
                    ? `${formatDate(start)} - ${formatDate(end)}`
                    : "Periodo personalizado"
        };
    }

    return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: "Este mes"
    };
}

function filterMovementsByPeriod(start, end) {
    if (!start && !end) {
        return [...allMovements];
    }

    return allMovements.filter(movement => {
        const date = movement._date;

        if (!date) {
            return false;
        }

        if (start && date < start) {
            return false;
        }

        if (end && date > end) {
            return false;
        }

        return true;
    });
}

function calculatePeriodTotals(movements) {
    let income = 0;
    let expenses = 0;
    let investments = 0;

    let incomeCount = 0;
    let expenseCount = 0;
    let investmentCount = 0;

    movements.forEach(movement => {
        if (movement._type === "ingreso") {
            income += movement._amount;
            incomeCount += 1;
        }

        if (movement._type === "egreso") {
            expenses += movement._amount;
            expenseCount += 1;
        }

        if (movement._type === "inversion") {
            investments += movement._amount;
            investmentCount += 1;
        }
    });

    return {
        income,
        expenses,
        investments,
        netFlow:
            income -
            expenses -
            investments,
        incomeCount,
        expenseCount,
        investmentCount
    };
}

function pluralizeMovements(count) {
    return `${count} ${
        count === 1
            ? "movimiento"
            : "movimientos"
    }`;
}

function updateSummary(totals) {
    reportIncome.textContent =
        formatMoney(totals.income);

    reportExpenses.textContent =
        formatMoney(totals.expenses);

    reportInvestments.textContent =
        formatMoney(totals.investments);

    reportNetFlow.textContent =
        formatMoney(totals.netFlow);

    reportIncomeCount.textContent =
        pluralizeMovements(totals.incomeCount);

    reportExpensesCount.textContent =
        pluralizeMovements(totals.expenseCount);

    reportInvestmentsCount.textContent =
        pluralizeMovements(totals.investmentCount);

    reportInitialBalance.textContent =
        formatMoney(initialBalance);

    reportCurrentBalance.textContent =
        formatMoney(currentBalance);

    reportRecurringMonthly.textContent =
        formatMoney(getRecurringMonthlyTotal());

    reportMovementCount.textContent =
        filteredMovements.length;

    distributionIncome.textContent =
        formatMoney(totals.income);

    distributionExpenses.textContent =
        formatMoney(totals.expenses);

    distributionInvestments.textContent =
        formatMoney(totals.investments);

    const netCard =
        reportNetFlow.closest(".report-summary-card");

    if (netCard) {
        netCard.classList.remove(
            "net-positive",
            "net-negative"
        );

        if (totals.netFlow > 0) {
            netCard.classList.add("net-positive");
        }

        if (totals.netFlow < 0) {
            netCard.classList.add("net-negative");
        }
    }
}

function typeLabel(type) {
    if (type === "ingreso") {
        return "Ingreso";
    }

    if (type === "egreso") {
        return "Egreso";
    }

    if (type === "inversion") {
        return "Inversión";
    }

    return "Otro";
}

function typeClass(type) {
    if (type === "ingreso") {
        return "income";
    }

    if (type === "egreso") {
        return "expense";
    }

    if (type === "inversion") {
        return "investment";
    }

    return "";
}

function renderMovementsTable() {
    if (!filteredMovements.length) {
        reportMovementsTable.innerHTML = `
            <tr class="report-empty-row">
                <td colspan="4">
                    No hay movimientos para mostrar.
                </td>
            </tr>
        `;

        return;
    }

    const visibleMovements =
        filteredMovements.slice(0, 12);

    reportMovementsTable.innerHTML =
        visibleMovements
            .map(movement => {
                const type = movement._type;
                const cssClass = typeClass(type);

                const prefix =
                    type === "ingreso"
                        ? "+"
                        : type === "egreso" ||
                          type === "inversion"
                            ? "-"
                            : "";

                return `
                    <tr>

                        <td>
                            ${formatDate(movement._date)}
                        </td>

                        <td>
                            <div
                                class="report-movement-concept"
                                title="${escapeHTML(
                                    getMovementConcept(movement)
                                )}"
                            >
                                ${escapeHTML(
                                    getMovementConcept(movement)
                                )}
                            </div>
                        </td>

                        <td>
                            <span
                                class="report-type-badge ${cssClass}"
                            >
                                ${typeLabel(type)}
                            </span>
                        </td>

                        <td>
                            <span
                                class="report-amount ${cssClass}"
                            >
                                ${prefix}${formatMoney(
                                    movement._amount
                                )}
                            </span>
                        </td>

                    </tr>
                `;
            })
            .join("");
}

function categoryIcon(category) {
    const text = String(category)
        .toLowerCase();

    if (
        text.includes("producto") ||
        text.includes("insumo")
    ) {
        return "package";
    }

    if (
        text.includes("servicio") ||
        text.includes("venta")
    ) {
        return "badge-dollar-sign";
    }

    if (
        text.includes("equipo") ||
        text.includes("herramienta")
    ) {
        return "wrench";
    }

    if (
        text.includes("local") ||
        text.includes("renta")
    ) {
        return "building-2";
    }

    if (
        text.includes("publicidad") ||
        text.includes("marketing")
    ) {
        return "megaphone";
    }

    if (text.includes("ingreso")) {
        return "circle-arrow-up";
    }

    if (text.includes("egreso")) {
        return "circle-arrow-down";
    }

    if (text.includes("inversion")) {
        return "landmark";
    }

    return "tag";
}

function renderCategories() {
    if (!filteredMovements.length) {
        reportCategoriesContainer.innerHTML = `
            <div class="report-empty-state">

                <div>
                    <i data-lucide="tags"></i>
                </div>

                <strong>
                    Sin información disponible
                </strong>

                <span>
                    No hay categorías para mostrar en este periodo.
                </span>

            </div>
        `;

        refreshIcons();
        return;
    }

    const categories = new Map();

    filteredMovements.forEach(movement => {
        const category =
            getMovementCategory(movement);

        const key = category
            .trim()
            .toLowerCase();

        if (!categories.has(key)) {
            categories.set(key, {
                name: category,
                total: 0,
                count: 0
            });
        }

        const item = categories.get(key);

        item.total += movement._amount;
        item.count += 1;
    });

    const categoryArray = [...categories.values()]
        .sort(
            (a, b) =>
                b.total - a.total
        )
        .slice(0, 7);

    const maximum = Math.max(
        ...categoryArray.map(item => item.total),
        1
    );

    reportCategoriesContainer.innerHTML =
        categoryArray
            .map(item => {
                const percentage =
                    (item.total / maximum) * 100;

                return `
                    <div class="report-category-row">

                        <div class="report-category-top">

                            <div class="report-category-name">

                                <div class="report-category-icon">
                                    <i
                                        data-lucide="${categoryIcon(
                                            item.name
                                        )}"
                                    ></i>
                                </div>

                                <div>

                                    <strong>
                                        ${escapeHTML(item.name)}
                                    </strong>

                                    <span>
                                        ${pluralizeMovements(
                                            item.count
                                        )}
                                    </span>

                                </div>

                            </div>

                            <span class="report-category-value">
                                ${formatMoney(item.total)}
                            </span>

                        </div>

                        <div class="report-category-progress">
                            <span
                                style="width: ${percentage}%"
                            ></span>
                        </div>

                    </div>
                `;
            })
            .join("");

    refreshIcons();
}

function getMonthKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0")
    ].join("-");
}

function getMonthLabel(date) {
    return new Intl.DateTimeFormat("es-MX", {
        month: "short",
        year: "2-digit"
    }).format(date);
}

function buildMonthlySeries() {
    if (!filteredMovements.length) {
        return {
            labels: ["Sin datos"],
            income: [0],
            expenses: [0],
            investments: [0]
        };
    }

    const ordered = [...filteredMovements]
        .sort(
            (a, b) =>
                a._date.getTime() -
                b._date.getTime()
        );

    let start =
        currentPeriodStart ||
        ordered[0]._date;

    let end =
        currentPeriodEnd ||
        ordered[ordered.length - 1]._date;

    if (!start || !end) {
        return {
            labels: ["Sin datos"],
            income: [0],
            expenses: [0],
            investments: [0]
        };
    }

    const startMonth = new Date(
        start.getFullYear(),
        start.getMonth(),
        1
    );

    const endMonth = new Date(
        end.getFullYear(),
        end.getMonth(),
        1
    );

    const months = [];

    const cursor = new Date(startMonth);

    let guard = 0;

    while (
        cursor <= endMonth &&
        guard < 60
    ) {
        months.push(new Date(cursor));

        cursor.setMonth(
            cursor.getMonth() + 1
        );

        guard += 1;
    }

    if (!months.length) {
        months.push(
            new Date(
                ordered[0]._date.getFullYear(),
                ordered[0]._date.getMonth(),
                1
            )
        );
    }

    const values = new Map();

    months.forEach(month => {
        values.set(
            getMonthKey(month),
            {
                income: 0,
                expenses: 0,
                investments: 0
            }
        );
    });

    ordered.forEach(movement => {
        const key = getMonthKey(
            movement._date
        );

        if (!values.has(key)) {
            return;
        }

        const item = values.get(key);

        if (movement._type === "ingreso") {
            item.income += movement._amount;
        }

        if (movement._type === "egreso") {
            item.expenses += movement._amount;
        }

        if (movement._type === "inversion") {
            item.investments += movement._amount;
        }
    });

    return {
        labels: months.map(getMonthLabel),

        income: months.map(
            month =>
                values.get(
                    getMonthKey(month)
                ).income
        ),

        expenses: months.map(
            month =>
                values.get(
                    getMonthKey(month)
                ).expenses
        ),

        investments: months.map(
            month =>
                values.get(
                    getMonthKey(month)
                ).investments
        )
    };
}

function destroyCharts() {
    if (flowChart) {
        flowChart.destroy();
        flowChart = null;
    }

    if (distributionChart) {
        distributionChart.destroy();
        distributionChart = null;
    }
}

function renderFlowChart() {
    const canvas =
        document.getElementById(
            "reportFlowChart"
        );

    if (!canvas || !window.Chart) {
        return;
    }

    if (flowChart) {
        flowChart.destroy();
    }

    const series =
        buildMonthlySeries();

    flowChart = new Chart(
        canvas,
        {
            type: "line",

            data: {
                labels: series.labels,

                datasets: [
                    {
                        label: "Ingresos",
                        data: series.income,
                        borderColor: "#42d99b",
                        backgroundColor: "rgba(66,217,155,.08)",
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.35,
                        fill: false
                    },
                    {
                        label: "Egresos",
                        data: series.expenses,
                        borderColor: "#ff6472",
                        backgroundColor: "rgba(255,100,114,.08)",
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.35,
                        fill: false
                    },
                    {
                        label: "Inversiones",
                        data: series.investments,
                        borderColor: "#ffad5b",
                        backgroundColor: "rgba(255,173,91,.08)",
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.35,
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
                        backgroundColor: "#0b1117",
                        borderColor: "rgba(255,255,255,.08)",
                        borderWidth: 1,
                        titleColor: "#dbe3e8",
                        bodyColor: "#89959e",
                        padding: 10,

                        callbacks: {
                            label(context) {
                                return `${context.dataset.label}: ${formatMoney(
                                    context.raw
                                )}`;
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        grid: {
                            display: false
                        },

                        ticks: {
                            color: "#52606b",
                            font: {
                                size: 9
                            }
                        },

                        border: {
                            color: "rgba(255,255,255,.04)"
                        }
                    },

                    y: {
                        beginAtZero: true,

                        grid: {
                            color: "rgba(255,255,255,.035)"
                        },

                        ticks: {
                            color: "#52606b",
                            font: {
                                size: 9
                            },

                            callback(value) {
                                return new Intl.NumberFormat(
                                    "es-MX",
                                    {
                                        notation: "compact",
                                        maximumFractionDigits: 1
                                    }
                                ).format(value);
                            }
                        },

                        border: {
                            display: false
                        }
                    }
                }
            }
        }
    );
}

function renderDistributionChart(totals) {
    const canvas =
        document.getElementById(
            "reportDistributionChart"
        );

    if (!canvas || !window.Chart) {
        return;
    }

    if (distributionChart) {
        distributionChart.destroy();
    }

    const values = [
        totals.income,
        totals.expenses,
        totals.investments
    ];

    const hasData =
        values.some(value => value > 0);

    distributionChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels: [
                    "Ingresos",
                    "Egresos",
                    "Inversiones"
                ],

                datasets: [
                    {
                        data: hasData
                            ? values
                            : [1],

                        backgroundColor: hasData
                            ? [
                                "#42d99b",
                                "#ff6472",
                                "#ffad5b"
                            ]
                            : [
                                "#172028"
                            ],

                        borderWidth: 0,
                        hoverOffset: 2
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
                        enabled: hasData,
                        backgroundColor: "#0b1117",
                        borderColor: "rgba(255,255,255,.08)",
                        borderWidth: 1,
                        titleColor: "#dbe3e8",
                        bodyColor: "#89959e",

                        callbacks: {
                            label(context) {
                                return `${context.label}: ${formatMoney(
                                    context.raw
                                )}`;
                            }
                        }
                    }
                }
            }
        }
    );
}

function updateGeneratedDate() {
    reportGeneratedAt.textContent =
        formatDateTime(new Date());
}

function applyPeriod(showNotification = true) {
    const selectedPeriod =
        reportPeriod.value;

    const range =
        getPeriodRange(selectedPeriod);

    if (
        selectedPeriod === "custom" &&
        (!range.start || !range.end)
    ) {
        showToast(
            "Selecciona las fechas",
            "Indica una fecha inicial y una fecha final.",
            "error"
        );

        return;
    }

    if (
        range.start &&
        range.end &&
        range.start > range.end
    ) {
        showToast(
            "Periodo inválido",
            "La fecha inicial no puede ser posterior a la fecha final.",
            "error"
        );

        return;
    }

    currentPeriodStart =
        range.start;

    currentPeriodEnd =
        range.end;

    filteredMovements =
        filterMovementsByPeriod(
            range.start,
            range.end
        );

    const totals =
        calculatePeriodTotals(
            filteredMovements
        );

    reportPeriodLabel.textContent =
        range.label;

    updateSummary(totals);
    renderMovementsTable();
    renderCategories();
    renderFlowChart();
    renderDistributionChart(totals);
    updateGeneratedDate();

    if (showNotification) {
        showToast(
            "Reporte actualizado",
            `${filteredMovements.length} movimientos incluidos en el periodo.`
        );
    }
}

function handlePeriodChange() {
    const isCustom =
        reportPeriod.value === "custom";

    customDateFields.classList.toggle(
        "hidden",
        !isCustom
    );

    if (isCustom) {
        const now = new Date();

        if (!reportStartDate.value) {
            reportStartDate.value =
                formatInputDate(
                    startOfMonth(now)
                );
        }

        if (!reportEndDate.value) {
            reportEndDate.value =
                formatInputDate(now);
        }
    }

    refreshIcons();
}

function escapeCSV(value) {
    const text = String(
        value ?? ""
    );

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {
        return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
}

function exportExcel() {
    if (!filteredMovements.length) {
        showToast(
            "Sin datos para exportar",
            "El periodo seleccionado no contiene movimientos.",
            "error"
        );

        return;
    }

    const totals =
        calculatePeriodTotals(
            filteredMovements
        );

    const rows = [
        [
            "PMC AUTO DETAILING",
            "REPORTE FINANCIERO"
        ],

        [
            "Periodo",
            reportPeriodLabel.textContent
        ],

        [
            "Generado",
            formatDateTime(new Date())
        ],

        [],

        [
            "RESUMEN"
        ],

        [
            "Ingresos",
            totals.income.toFixed(2)
        ],

        [
            "Egresos",
            totals.expenses.toFixed(2)
        ],

        [
            "Inversiones",
            totals.investments.toFixed(2)
        ],

        [
            "Flujo neto",
            totals.netFlow.toFixed(2)
        ],

        [
            "Balance inicial",
            initialBalance.toFixed(2)
        ],

        [
            "Balance actual",
            currentBalance.toFixed(2)
        ],

        [
            "Recurrentes mensuales",
            getRecurringMonthlyTotal().toFixed(2)
        ],

        [],

        [
            "MOVIMIENTOS"
        ],

        [
            "Fecha",
            "Concepto",
            "Categoría",
            "Tipo",
            "Monto MXN"
        ]
    ];

    filteredMovements
        .slice()
        .sort(
            (a, b) =>
                a._date.getTime() -
                b._date.getTime()
        )
        .forEach(movement => {
            rows.push([
                formatDate(movement._date),
                getMovementConcept(movement),
                getMovementCategory(movement),
                typeLabel(movement._type),
                movement._amount.toFixed(2)
            ]);
        });

    const csv =
        "\uFEFF" +
        rows
            .map(row =>
                row
                    .map(escapeCSV)
                    .join(",")
            )
            .join("\r\n");

    const blob = new Blob(
        [csv],
        {
            type:
                "text/csv;charset=utf-8;"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    const now = new Date();

    const fileDate =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}`;

    link.href = url;
    link.download =
        `PMC-Reporte-Financiero-${fileDate}.csv`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast(
        "Reporte exportado",
        "El archivo compatible con Excel fue generado correctamente."
    );
}

function buildPrintableMovements() {
    if (!filteredMovements.length) {
        return `
            <tr>
                <td
                    colspan="4"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#777;
                    "
                >
                    Sin movimientos en el periodo.
                </td>
            </tr>
        `;
    }

    return filteredMovements
        .slice()
        .sort(
            (a, b) =>
                a._date.getTime() -
                b._date.getTime()
        )
        .map(movement => {
            const prefix =
                movement._type === "ingreso"
                    ? "+"
                    : movement._type === "egreso" ||
                      movement._type === "inversion"
                        ? "-"
                        : "";

            return `
                <tr>
                    <td>
                        ${formatDate(movement._date)}
                    </td>

                    <td>
                        ${escapeHTML(
                            getMovementConcept(movement)
                        )}
                    </td>

                    <td>
                        ${typeLabel(movement._type)}
                    </td>

                    <td style="text-align:right;">
                        ${prefix}${formatMoney(
                            movement._amount
                        )}
                    </td>
                </tr>
            `;
        })
        .join("");
}

function exportPdf() {
    const totals =
        calculatePeriodTotals(
            filteredMovements
        );

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

    if (!printWindow) {
        showToast(
            "Ventana bloqueada",
            "Permite ventanas emergentes para generar el PDF.",
            "error"
        );

        return;
    }

    const generatedAt =
        formatDateTime(new Date());

    printWindow.document.write(`
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                Reporte Financiero PMC
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 36px;
                    background: #ffffff;
                    color: #1d252b;
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                    font-size: 12px;
                }

                .header {
                    padding-bottom: 18px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    border-bottom: 2px solid #159fe6;
                }

                .brand {
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .brand span {
                    display: block;
                    margin-top: 3px;
                    color: #159fe6;
                    font-size: 10px;
                    letter-spacing: 2px;
                }

                .report-info {
                    text-align: right;
                }

                .report-info strong {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 15px;
                }

                .report-info span {
                    display: block;
                    margin-top: 3px;
                    color: #6b747a;
                    font-size: 10px;
                }

                .section-title {
                    margin: 26px 0 10px;
                    color: #159fe6;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 1.4px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 10px;
                }

                .card {
                    padding: 13px;
                    border: 1px solid #e4e8eb;
                    border-radius: 8px;
                }

                .card span {
                    display: block;
                    margin-bottom: 6px;
                    color: #7b858c;
                    font-size: 9px;
                }

                .card strong {
                    font-size: 14px;
                }

                .financial {
                    margin-top: 10px;
                    padding: 13px;
                    display: grid;
                    grid-template-columns:
                        repeat(3, 1fr);
                    gap: 10px;
                    border: 1px solid #e4e8eb;
                    border-radius: 8px;
                }

                .financial span {
                    display: block;
                    color: #7b858c;
                    font-size: 9px;
                }

                .financial strong {
                    display: block;
                    margin-top: 5px;
                    font-size: 12px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th {
                    padding: 9px 8px;
                    background: #f3f6f8;
                    color: #58636a;
                    font-size: 9px;
                    text-align: left;
                }

                td {
                    padding: 9px 8px;
                    border-bottom: 1px solid #eceff1;
                    font-size: 10px;
                }

                .footer {
                    margin-top: 28px;
                    padding-top: 12px;
                    border-top: 1px solid #e4e8eb;
                    color: #8a949a;
                    font-size: 9px;
                    line-height: 1.5;
                }

                @media print {

                    body {
                        padding: 18px;
                    }

                    @page {
                        size: A4;
                        margin: 12mm;
                    }

                }

            </style>

        </head>

        <body>

            <div class="header">

                <div class="brand">
                    PMC

                    <span>
                        AUTO DETAILING
                    </span>
                </div>

                <div class="report-info">

                    <strong>
                        Reporte financiero
                    </strong>

                    <span>
                        ${escapeHTML(
                            reportPeriodLabel.textContent
                        )}
                    </span>

                    <span>
                        Generado: ${generatedAt}
                    </span>

                </div>

            </div>

            <div class="section-title">
                RESUMEN DEL PERIODO
            </div>

            <div class="summary">

                <div class="card">
                    <span>Ingresos</span>
                    <strong>
                        ${formatMoney(totals.income)}
                    </strong>
                </div>

                <div class="card">
                    <span>Egresos</span>
                    <strong>
                        ${formatMoney(totals.expenses)}
                    </strong>
                </div>

                <div class="card">
                    <span>Inversiones</span>
                    <strong>
                        ${formatMoney(totals.investments)}
                    </strong>
                </div>

                <div class="card">
                    <span>Flujo neto</span>
                    <strong>
                        ${formatMoney(totals.netFlow)}
                    </strong>
                </div>

            </div>

            <div class="financial">

                <div>
                    <span>
                        Balance inicial
                    </span>

                    <strong>
                        ${formatMoney(initialBalance)}
                    </strong>
                </div>

                <div>
                    <span>
                        Balance actual
                    </span>

                    <strong>
                        ${formatMoney(currentBalance)}
                    </strong>
                </div>

                <div>
                    <span>
                        Recurrentes mensuales
                    </span>

                    <strong>
                        ${formatMoney(
                            getRecurringMonthlyTotal()
                        )}
                    </strong>
                </div>

            </div>

            <div class="section-title">
                MOVIMIENTOS INCLUIDOS
            </div>

            <table>

                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th style="text-align:right;">
                            Monto
                        </th>
                    </tr>
                </thead>

                <tbody>
                    ${buildPrintableMovements()}
                </tbody>

            </table>

            <div class="footer">
                Documento generado por PMC Finanzas.
                Este reporte corresponde a una herramienta
                interna de seguimiento financiero y se basa
                en los movimientos registrados en el sistema.
            </div>

            <script>
                window.onload = function () {
                    setTimeout(function () {
                        window.print();
                    }, 300);
                };
            <\/script>

        </body>

        </html>
    `);

    printWindow.document.close();

    showToast(
        "Reporte preparado",
        "Selecciona “Guardar como PDF” en la ventana de impresión."
    );
}

async function verifyFinancialAccess(user) {
    try {
        const reference =
            doc(
                db,
                "usuarios",
                user.uid
            );

        const snapshot =
            await getDoc(reference);

        if (!snapshot.exists()) {
            return false;
        }

        const data =
            snapshot.data();

        if (
            !data.permisos ||
            data.permisos.finanzas !== true
        ) {
            return false;
        }

        const displayName =
            data.nombre ||
            user.displayName ||
            user.email ||
            "Usuario";

        const initials =
            getInitials(displayName);

        sidebarUserName.textContent =
            displayName;

        topbarUserName.textContent =
            displayName;

        sidebarAvatar.textContent =
            initials;

        topbarAvatar.textContent =
            initials;

        return true;
    } catch (error) {
        console.error(
            "Error verificando acceso financiero:",
            error
        );

        return false;
    }
}

async function initializeReports() {
    await Promise.all([
        loadInitialBalance(),
        loadMovements(),
        loadRecurring()
    ]);

    calculateCurrentBalance();

    handlePeriodChange();
    applyPeriod(false);

    refreshIcons();
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
                destroyCharts();

                await signOut(auth);

                window.location.replace(
                    "index.html"
                );
            } catch (error) {
                console.error(
                    "Error cerrando sesión:",
                    error
                );
            }
        }
    );
}

reportPeriod.addEventListener(
    "change",
    () => {
        handlePeriodChange();

        if (
            reportPeriod.value !== "custom"
        ) {
            applyPeriod(false);
        }
    }
);

applyReportFilter.addEventListener(
    "click",
    () => {
        applyPeriod(true);
    }
);

exportExcelButton.addEventListener(
    "click",
    exportExcel
);

exportPdfButton.addEventListener(
    "click",
    exportPdf
);

onAuthStateChanged(
    auth,
    async user => {
        if (!user) {
            window.location.replace(
                "index.html"
            );

            return;
        }

        currentUser = user;

        const hasAccess =
            await verifyFinancialAccess(user);

        if (!hasAccess) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            window.location.replace(
                "index.html"
            );

            return;
        }

        securityLoader.classList.add(
            "hidden"
        );

        app.classList.remove(
            "hidden"
        );

        refreshIcons();

        await initializeReports();
    }
);

refreshIcons();