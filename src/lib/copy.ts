// Textos de la interfaz (es-CO). Centralizados para facilitar una futura traducción.
export const copy = {
  landing: {
    tagline: "Baños y peluquería para perros y gatos",
    description:
      "Agenda en minutos desde tu celular. Te esperamos con el agua tibia y mucha espuma.",
    bookCta: "Reservar",
    servicesCta: "Ver servicios",
  },
  nav: {
    home: "Inicio",
  },
  auth: {
    title: "Ingresar",
    intro: "Usa tu cuenta de Google para agendar y ver tus citas.",
    google: "Continuar con Google",
    redirecting: "Abriendo Google…",
    signedInAs: "Sesión iniciada como",
    error: "No pudimos iniciar sesión. Intenta de nuevo.",
    unexpectedError: "Algo salió mal al conectar con Google. Intenta de nuevo.",
    signOut: "Cerrar sesión",
    noAccessTitle: "No tienes acceso a esta sección",
    noAccessBody:
      "Tu cuenta no tiene permisos para entrar aquí. Si crees que es un error, pide acceso al administrador.",
    backHome: "Volver al inicio",
    chooseTitle: "¿Qué spa quieres administrar?",
  },
  admin: {
    panelTitle: (businessName: string) => `Panel · ${businessName}`,
    navLabel: "Panel",
    nav: {
      home: "Inicio",
      locations: "Locales",
      breeds: "Razas",
    },
  },
  platform: {
    title: "Consola Prisma Lab",
  },
} as const;
