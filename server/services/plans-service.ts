const defaultPlans = [
  {
    id: "plan_10_days",
    code: "10_days",
    name: "10 дней",
    kind: "time_access",
    price: 300,
    currency: "RUB",
    quota_days: 10,
    quota_messages: null
  },
  {
    id: "plan_50_requests",
    code: "50_requests",
    name: "50 запросов",
    kind: "request_pack",
    price: 500,
    currency: "RUB",
    quota_days: null,
    quota_messages: 50
  },
  {
    id: "plan_100_requests",
    code: "100_requests",
    name: "100 запросов",
    kind: "request_pack",
    price: 900,
    currency: "RUB",
    quota_days: null,
    quota_messages: 100
  }
];

export function listPlans() {
  return {
    items: defaultPlans
  };
}

export function getPlanById(planId: string) {
  return defaultPlans.find((plan) => plan.id === planId) ?? null;
}
