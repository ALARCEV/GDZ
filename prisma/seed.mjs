import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const policies = [
  {
    name: "guest_default",
    userSegment: "guest",
    dailyMessages: 5,
    dailyImages: 2,
    dailyVoiceMinutes: 3,
    monthlyMessages: null,
    saveHistoryEnabled: false,
    captureAfterValue: 1,
    softLimit: true,
    billingPlanCode: null,
    active: true
  },
  {
    name: "registered_free",
    userSegment: "registered_free",
    dailyMessages: 30,
    dailyImages: 5,
    dailyVoiceMinutes: 10,
    monthlyMessages: 300,
    saveHistoryEnabled: true,
    captureAfterValue: 1,
    softLimit: true,
    billingPlanCode: "free",
    active: true
  },
  {
    name: "paid_pack_10_days",
    userSegment: "paid_pack",
    dailyMessages: 80,
    dailyImages: 20,
    dailyVoiceMinutes: 30,
    monthlyMessages: null,
    saveHistoryEnabled: true,
    captureAfterValue: 0,
    softLimit: false,
    billingPlanCode: "10_days",
    active: true
  },
  {
    name: "paid_pack_50_requests",
    userSegment: "paid_pack",
    dailyMessages: null,
    dailyImages: 15,
    dailyVoiceMinutes: 20,
    monthlyMessages: 50,
    saveHistoryEnabled: true,
    captureAfterValue: 0,
    softLimit: false,
    billingPlanCode: "50_requests",
    active: true
  },
  {
    name: "paid_pack_100_requests",
    userSegment: "paid_pack",
    dailyMessages: null,
    dailyImages: 30,
    dailyVoiceMinutes: 40,
    monthlyMessages: 100,
    saveHistoryEnabled: true,
    captureAfterValue: 0,
    softLimit: false,
    billingPlanCode: "100_requests",
    active: true
  },
  {
    name: "admin_unlimited",
    userSegment: "admin",
    dailyMessages: null,
    dailyImages: null,
    dailyVoiceMinutes: null,
    monthlyMessages: null,
    saveHistoryEnabled: true,
    captureAfterValue: 0,
    softLimit: false,
    billingPlanCode: "internal",
    active: true
  }
];

const promptProfiles = [
  {
    label: "1-4 simple explanation",
    active: true,
    gradeFrom: 1,
    gradeTo: 4,
    mode: "simple_explanation",
    systemPrompt:
      "Объясняй короткими фразами, простыми словами и с очень явными переходами между шагами.",
    parentOverlayPrompt:
      "Добавь в конце 1 короткую подсказку для родителя, как поддержать ребенка без готового ответа.",
    subjectOverridesJson: {
      math: "Используй короткие числовые примеры и проговаривай смысл каждого действия.",
      russian: "Давай 1 правило и 1 короткий пример."
    }
  },
  {
    label: "5-7 step by step",
    active: true,
    gradeFrom: 5,
    gradeTo: 7,
    mode: "step_by_step_solution",
    systemPrompt:
      "Веди ученика по шагам, показывай логику решения и не перепрыгивай через промежуточные выводы.",
    parentOverlayPrompt:
      "Если уместно, добавь отдельный блок для родителя с кратким объяснением где может возникнуть ошибка.",
    subjectOverridesJson: {
      math: "Выделяй формулу, затем подстановку, затем вычисление.",
      english: "Используй простые примеры и короткие подсказки по грамматике."
    }
  }
];

async function main() {
  for (const policy of policies) {
    await prisma.quotaPolicy.upsert({
      where: { name: policy.name },
      update: policy,
      create: policy
    });
  }

  for (const profile of promptProfiles) {
    await prisma.promptProfile.upsert({
      where: {
        id: `${profile.gradeFrom}-${profile.gradeTo}-${profile.mode}`
      },
      update: profile,
      create: {
        id: `${profile.gradeFrom}-${profile.gradeTo}-${profile.mode}`,
        ...profile
      }
    });
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed quota policies.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
