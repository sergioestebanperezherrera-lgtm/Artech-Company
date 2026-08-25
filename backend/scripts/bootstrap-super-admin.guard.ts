export const productionBootstrapEnvironmentVariable =
  "ARTECH_ALLOW_PRODUCTION_SUPER_ADMIN_BOOTSTRAP";
export const productionBootstrapConfirmation =
  "ALLOW_FIRST_SUPER_ADMIN_ONCE";

type BootstrapEnvironment = Record<string, string | undefined>;

type ParsedBootstrapArguments = {
  email: string;
  confirmEmail: string;
  confirmProduction: boolean;
};

function getUsage() {
  return [
    "Usage: npm run admin:bootstrap-super-admin --",
    "--email <existing-user-email>",
    "--confirm-email <same-email>",
    "--confirm-production",
  ].join(" ");
}

function parseArguments(args: string[]): ParsedBootstrapArguments {
  let email = "";
  let confirmEmail = "";
  let confirmProduction = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--confirm-production") {
      if (confirmProduction) {
        throw new Error(getUsage());
      }

      confirmProduction = true;
      continue;
    }

    if (argument !== "--email" && argument !== "--confirm-email") {
      throw new Error(getUsage());
    }

    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(getUsage());
    }

    if (argument === "--email") {
      if (email) {
        throw new Error(getUsage());
      }

      email = value;
    } else {
      if (confirmEmail) {
        throw new Error(getUsage());
      }

      confirmEmail = value;
    }

    index += 1;
  }

  return { email, confirmEmail, confirmProduction };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateProductionBootstrapRequest(
  args: string[],
  environment: BootstrapEnvironment,
) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("Production SUPER_ADMIN bootstrap requires NODE_ENV=production.");
  }

  if (
    environment.RAILWAY_ENVIRONMENT_NAME !== "production" ||
    !environment.RAILWAY_SERVICE_ID
  ) {
    throw new Error(
      "Production SUPER_ADMIN bootstrap must run inside the Railway production service.",
    );
  }

  if (
    environment[productionBootstrapEnvironmentVariable] !==
    productionBootstrapConfirmation
  ) {
    throw new Error(
      `Production bootstrap is locked. Set ${productionBootstrapEnvironmentVariable} only for this command.`,
    );
  }

  const parsed = parseArguments(args);
  const email = normalizeEmail(parsed.email);
  const confirmedEmail = normalizeEmail(parsed.confirmEmail);

  if (!parsed.confirmProduction || !email || email !== confirmedEmail) {
    throw new Error(getUsage());
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid existing user email is required.");
  }

  return { email };
}
