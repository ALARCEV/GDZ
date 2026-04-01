export const appConfig = {
  name: "Школьный ассистент",
  primaryAudience: "parent",
  funnel: ["guest", "value_moment", "capture"] as const,
  inputModalities: ["text", "image", "voice"] as const
};

export const appRoutes = {
  home: "/",
  chat: "/chat",
  history: "/history",
  profile: "/profile",
  admin: "/admin"
} as const;
