import { UserRole } from "@prisma/client";

import { db } from "@/server/db/client";
import { notFound } from "@/server/errors/api-error";
import { quotaService, summarizeUsage } from "@/server/services/quota-service";

function getPlanStatus(billingPlanCode: string | null | undefined) {
  if (!billingPlanCode || billingPlanCode === "free") {
    return "free";
  }

  return "paid";
}

export class ProfileService {
  async getMe(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        childProfiles: {
          take: 1,
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!user) {
      throw notFound("Authenticated user was not found.");
    }

    const quota = await quotaService.getSnapshot({
      userId: user.id,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        role: user.role.toLowerCase(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        child_grade: user.role === UserRole.PARENT ? user.childProfiles[0]?.grade ?? null : null,
        student_age: user.role === UserRole.STUDENT ? user.studentAge ?? null : null
      },
      quota: {
        policy: quota.policy.name,
        messages_remaining: quota.remaining.messages,
        images_remaining: quota.remaining.images,
        voice_minutes_remaining: quota.remaining.voiceMinutes
      },
      plan: {
        status: getPlanStatus(user.billingPlanCode),
        code: user.billingPlanCode ?? "free"
      }
    };
  }

  async updateMe(
    userId: string,
    input: {
      name?: string;
      phone?: string | null;
      child_grade?: number | null;
      student_age?: number | null;
    }
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        childProfiles: {
          take: 1,
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!user) {
      throw notFound("Authenticated user was not found.");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        name: input.name ?? user.name,
        phone: input.phone === undefined ? user.phone : input.phone,
        studentAge:
          user.role === UserRole.STUDENT
            ? input.student_age === undefined
              ? user.studentAge
              : input.student_age
            : user.studentAge
      }
    });

    if (user.role === UserRole.PARENT && input.child_grade !== undefined) {
      if (user.childProfiles[0]) {
        await db.childProfile.update({
          where: { id: user.childProfiles[0].id },
          data: {
            grade: input.child_grade ?? user.childProfiles[0].grade
          }
        });
      } else if (input.child_grade != null) {
        await db.childProfile.create({
          data: {
            parentId: user.id,
            grade: input.child_grade
          }
        });
      }
    }

    return this.getMe(user.id);
  }

  async getUsage(userId: string, role: UserRole) {
    const [events, snapshot] = await Promise.all([
      db.usageEvent.findMany({
        where: { userId }
      }),
      quotaService.getSnapshot({
        userId,
        role
      })
    ]);
    const summary = summarizeUsage(events);

    return {
      current_period: {
        messages_used: summary.daily.messages,
        images_used: summary.daily.images,
        voice_minutes_used: summary.daily.voiceMinutes
      },
      limits: {
        messages: snapshot.policy.dailyMessages ?? snapshot.policy.monthlyMessages ?? null,
        images: snapshot.policy.dailyImages,
        voice_minutes: snapshot.policy.dailyVoiceMinutes
      }
    };
  }
}

export const profileService = new ProfileService();
