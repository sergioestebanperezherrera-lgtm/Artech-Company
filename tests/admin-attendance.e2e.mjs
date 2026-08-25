import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";

const allAttendancePermissions = [
  "employee.read",
  "attendance.read",
  "attendance.record",
  "attendance.override",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function canReachServer() {
  return new Promise((resolve) => {
    const request = http.get(baseUrl, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    if (await canReachServer()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`No se pudo conectar con ${baseUrl}`);
}

async function ensureServer() {
  if (await canReachServer()) {
    return undefined;
  }

  const child =
    process.platform === "win32"
      ? spawn(
          "cmd.exe",
          ["/c", "npm", "run", "dev", "--", "--hostname", serverHost, "--port", serverPort],
          { cwd: process.cwd(), shell: false, stdio: "ignore", windowsHide: true },
        )
      : spawn(
          "npm",
          ["run", "dev", "--", "--hostname", serverHost, "--port", serverPort],
          { cwd: process.cwd(), shell: false, stdio: "ignore" },
        );

  await waitForServer();
  return child;
}

function stopServer(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function makeState() {
  const employees = [
    {
      id: "emp-ada",
      code: "EMP-001",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      email: "ada@artech.local",
      phone: null,
      isActive: true,
      status: "ACTIVE",
      hasSystemAccess: false,
      currentEmployment: {
        id: "employment-ada",
        status: "ACTIVE",
        startDate: "2026-08-01",
        endDate: null,
        notes: null,
        position: {
          id: "position-support",
          name: "Soporte",
          description: null,
          isActive: true,
        },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    },
    {
      id: "emp-noe",
      code: "EMP-002",
      firstName: "Noe",
      lastName: "Noche",
      name: "Noe Noche",
      email: "noe@artech.local",
      phone: null,
      isActive: true,
      status: "ACTIVE",
      hasSystemAccess: false,
      currentEmployment: {
        id: "employment-noe",
        status: "ACTIVE",
        startDate: "2026-08-01",
        endDate: null,
        notes: null,
        position: {
          id: "position-ops",
          name: "Operaciones",
          description: null,
          isActive: true,
        },
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    },
  ];

  const attendance = [
    attendanceRecord(employees[0], {
      id: "att-ada-1",
      workDate: "2026-08-25",
      expectedShiftName: "Turno Dia",
      expectedShiftType: "DAY",
      expectedStartTime: "08:00",
      expectedEndTime: "17:00",
      expectedCrossesMidnight: false,
      clockInAt: "2026-08-25T14:17:00.000Z",
      clockOutAt: "2026-08-25T23:05:00.000Z",
      status: "LATE",
      lateMinutes: 17,
    }),
    attendanceRecord(employees[1], {
      id: "att-noe-night",
      workDate: "2026-08-25",
      expectedShiftName: "Turno Nocturno",
      expectedShiftType: "NIGHT",
      expectedStartTime: "22:00",
      expectedEndTime: "06:00",
      expectedCrossesMidnight: true,
      clockInAt: "2026-08-26T04:00:00.000Z",
      clockOutAt: "2026-08-26T12:00:00.000Z",
      status: "PRESENT",
      lateMinutes: 0,
    }),
  ];

  return { employees, attendance, nextAttendance: 3 };
}

function employeeDetail(employee) {
  return {
    ...employee,
    user: null,
    employments: [employee.currentEmployment],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function attendanceRecord(employee, overrides) {
  const employment = employee.currentEmployment;

  return {
    id: overrides.id,
    employeeId: employee.id,
    employmentId: employment.id,
    shiftAssignmentId: `shift-assignment-${employee.id}`,
    workDate: overrides.workDate,
    expectedShiftName: overrides.expectedShiftName,
    expectedShiftType: overrides.expectedShiftType,
    expectedStartTime: overrides.expectedStartTime,
    expectedEndTime: overrides.expectedEndTime,
    expectedCrossesMidnight: overrides.expectedCrossesMidnight,
    clockInAt: overrides.clockInAt,
    clockOutAt: overrides.clockOutAt,
    status: overrides.status,
    lateMinutes: overrides.lateMinutes,
    notes: overrides.notes ?? null,
    adjustmentReason: overrides.adjustmentReason ?? null,
    adjustedBy: overrides.adjustedBy ?? null,
    employee: {
      id: employee.id,
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      isActive: employee.isActive,
    },
    employment: {
      id: employment.id,
      status: employment.status,
      startDate: employment.startDate,
      endDate: employment.endDate,
      position: {
        id: employment.position.id,
        name: employment.position.name,
      },
    },
    shiftAssignment: {
      id: `shift-assignment-${employee.id}`,
      shiftId: `shift-${employee.id}`,
    },
    createdAt: "2026-08-25T14:17:00.000Z",
    updatedAt: "2026-08-25T14:17:00.000Z",
  };
}

function filterAttendance(state, url) {
  const date = url.searchParams.get("date");
  const employeeId = url.searchParams.get("employeeId");
  const status = url.searchParams.get("status");

  return state.attendance.filter((record) => {
    if (date && record.workDate !== date) return false;
    if (employeeId && record.employeeId !== employeeId) return false;
    if (status && record.status !== status) return false;
    return true;
  });
}

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockAdminApi(page, state, permissions, counter = { attendance: 0 }) {
  const context = {
    user: {
      id: "qa-admin",
      name: "Admin QA",
      email: "admin.qa@artech.local",
    },
    employee: {
      id: "qa-employee",
      code: "ART-QA-001",
      isActive: true,
    },
    roles: ["QA_ADMIN"],
    permissions,
    canAccessAdmin: true,
  };

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      await fulfillJson(route, 200, context);
      return;
    }

    if (path === "/api/admin/positions") {
      await fulfillJson(route, 200, [
        {
          id: "position-support",
          name: "Soporte",
          description: null,
          isActive: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ]);
      return;
    }

    if (path === "/api/admin/employees" && method === "GET") {
      await fulfillJson(route, 200, state.employees);
      return;
    }

    const employeeAttendanceMatch = path.match(
      /^\/api\/admin\/employees\/([^/]+)\/attendance$/,
    );
    if (employeeAttendanceMatch && method === "GET") {
      await fulfillJson(
        route,
        200,
        state.attendance.filter(
          (record) => record.employeeId === employeeAttendanceMatch[1],
        ),
      );
      return;
    }

    const employeeMatch = path.match(/^\/api\/admin\/employees\/([^/]+)$/);
    if (employeeMatch && method === "GET") {
      const employee = state.employees.find((item) => item.id === employeeMatch[1]);
      await fulfillJson(
        route,
        employee ? 200 : 404,
        employee ? employeeDetail(employee) : { message: "Not found" },
      );
      return;
    }

    if (path === "/api/admin/attendance" && method === "GET") {
      counter.attendance += 1;
      await fulfillJson(route, 200, filterAttendance(state, url));
      return;
    }

    if (path === "/api/admin/attendance/clock-in" && method === "POST") {
      const input = request.postDataJSON();
      const employee = state.employees.find((item) => item.id === input.employeeId);
      const record = attendanceRecord(employee, {
        id: `att-created-${state.nextAttendance++}`,
        workDate: "2026-08-25",
        expectedShiftName: "Turno Dia",
        expectedShiftType: "DAY",
        expectedStartTime: "08:00",
        expectedEndTime: "17:00",
        expectedCrossesMidnight: false,
        clockInAt: "2026-08-25T14:13:00.000Z",
        clockOutAt: null,
        status: "LATE",
        lateMinutes: 13,
      });
      state.attendance.unshift(record);
      await fulfillJson(route, 201, record);
      return;
    }

    if (path === "/api/admin/attendance/clock-out" && method === "POST") {
      const input = request.postDataJSON();
      const record = state.attendance.find(
        (item) =>
          item.employeeId === input.employeeId && item.clockInAt && !item.clockOutAt,
      );
      if (!record) {
        await fulfillJson(route, 409, {
          message: "No open attendance record is available for clock-out.",
        });
        return;
      }
      record.clockOutAt = "2026-08-25T23:02:00.000Z";
      await fulfillJson(route, 200, record);
      return;
    }

    const attendanceMatch = path.match(/^\/api\/admin\/attendance\/([^/]+)$/);
    if (attendanceMatch && method === "PATCH") {
      const record = state.attendance.find((item) => item.id === attendanceMatch[1]);
      Object.assign(record, request.postDataJSON(), {
        adjustedBy: {
          id: "qa-admin",
          name: "Admin QA",
          email: "admin.qa@artech.local",
        },
      });
      await fulfillJson(route, 200, record);
      return;
    }

    await fulfillJson(route, 404, { message: `Unhandled ${method} ${path}` });
  });
}

async function createPage(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];

  page.setDefaultTimeout(12_000);
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  return { context, page, consoleErrors };
}

async function runTest(name, callback) {
  process.stdout.write(`\n- ${name}... `);
  await callback();
  process.stdout.write("ok");
}

const server = await ensureServer();
const browser = await chromium.launch();

try {
  await runTest("SUPER_ADMIN ve registros, ficha, corrige y ficha", async () => {
    const state = makeState();
    const { context, page, consoleErrors } = await createPage(browser);
    await mockAdminApi(page, state, allAttendancePermissions);

    await page.goto(`${baseUrl}/admin/attendance?date=2026-08-25`);
    await page.getByRole("heading", { name: "Asistencia" }).waitFor();
    await page.getByText("Ada Lovelace").filter({ visible: true }).first().waitFor();
    await page.getByText("17 min tarde").filter({ visible: true }).first().waitFor();
    await page.getByText("Turno Nocturno").filter({ visible: true }).first().waitFor();
    await page.getByText("22:00 - 06:00").filter({ visible: true }).first().waitFor();
    await page.getByText(/06:00/).filter({ visible: true }).first().waitFor();

    await page.getByRole("button", { name: "Registrar entrada" }).click();
    await page.getByLabel("Empleado activo").selectOption("emp-ada");
    await page.getByRole("button", { name: "Registrar entrada" }).last().click();
    await page.getByText("13 min tarde").filter({ visible: true }).first().waitFor();

    await page.getByRole("button", { name: /^Salida$/ }).first().click();
    await page.getByRole("button", { name: "Registrar salida" }).last().click();
    await page.getByText("Salida registrada.").waitFor();

    await page.getByRole("button", { name: "Corregir" }).first().click();
    await page.getByLabel("Motivo del ajuste").fill("Correccion QA");
    await page.getByRole("button", { name: "Guardar correccion" }).click();
    await page.getByText("Asistencia corregida.").waitFor();

    await page.goto(`${baseUrl}/admin/employees/emp-ada`);
    await page.getByRole("heading", { name: "Asistencia" }).waitFor();
    await page.getByText("Ver historial completo").click();
    await page.waitForURL(/\/admin\/attendance\?employeeId=emp-ada/);

    assert(consoleErrors.length === 0, consoleErrors.join("\n"));
    await context.close();
  });

  await runTest("attendance.read solo ve datos sin acciones", async () => {
    const state = makeState();
    const { context, page, consoleErrors } = await createPage(browser);
    await mockAdminApi(page, state, ["employee.read", "attendance.read"]);

    await page.goto(`${baseUrl}/admin/attendance?date=2026-08-25`);
    await page.getByText("Ada Lovelace").filter({ visible: true }).first().waitFor();
    assert(
      (await page.getByRole("button", { name: "Registrar entrada" }).count()) === 0,
      "read-only no debe poder fichar.",
    );
    assert(
      (await page.getByRole("button", { name: "Corregir" }).count()) === 0,
      "read-only no debe poder corregir.",
    );
    assert(consoleErrors.length === 0, consoleErrors.join("\n"));
    await context.close();
  });

  await runTest("attendance.record puede fichar sin corregir", async () => {
    const state = makeState();
    const { context, page, consoleErrors } = await createPage(browser);
    await mockAdminApi(page, state, [
      "employee.read",
      "attendance.read",
      "attendance.record",
    ]);

    await page.goto(`${baseUrl}/admin/attendance?date=2026-08-25`);
    await page.getByRole("button", { name: "Registrar entrada" }).click();
    assert(
      (await page.getByRole("button", { name: "Corregir" }).count()) === 0,
      "record sin override no debe corregir.",
    );
    assert(consoleErrors.length === 0, consoleErrors.join("\n"));
    await context.close();
  });

  await runTest("sin attendance.read no solicita datos", async () => {
    const state = makeState();
    const counter = { attendance: 0 };
    const { context, page, consoleErrors } = await createPage(browser);
    await mockAdminApi(page, state, ["employee.read"], counter);

    await page.goto(`${baseUrl}/admin/attendance`);
    await page.getByText("Modulo no disponible").waitFor();
    assert(counter.attendance === 0, "No debe solicitar asistencia sin permiso.");
    assert(consoleErrors.length === 0, consoleErrors.join("\n"));
    await context.close();
  });

  await runTest("responsive 375px y 1440px no desborda", async () => {
    for (const viewport of [
      { width: 375, height: 820 },
      { width: 1440, height: 900 },
    ]) {
      const state = makeState();
      const { context, page, consoleErrors } = await createPage(browser, viewport);
      await mockAdminApi(page, state, allAttendancePermissions);

      await page.goto(`${baseUrl}/admin/attendance?date=2026-08-25`);
      await page.getByText("Ada Lovelace").filter({ visible: true }).first().waitFor();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert(!hasHorizontalOverflow, `Overflow horizontal en ${viewport.width}px.`);
      assert(consoleErrors.length === 0, consoleErrors.join("\n"));
      await context.close();
    }
  });
} finally {
  await browser.close();
  if (server) {
    stopServer(server);
  }
}

process.stdout.write("\nAdmin attendance e2e OK\n");
