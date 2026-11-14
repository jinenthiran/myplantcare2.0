import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  Share2,
} from 'lucide-react';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';
import { SocialShareService } from '../services/socialShareService';

export interface BotanicalAchievement {
  id: string;
  title: string;
  description: string;
  badgeColor: string;
  category: 'Streak' | 'Rescue' | 'Care' | 'Intelligence' | 'Social' | 'AR';
  progressCurrent: number;
  progressTarget: number;
  unlocked: boolean;
  rewardXp: number;
}

interface BotanicalAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: {
    wateringCount: number;
    streakDays: number;
    rescuesCount: number;
    climateLogsCount: number;
    synergyRunsCount: number;
    qrScansCount: number;
    arSnapshotsCount: number;
    sharesCount: number;
  };
}

export const BotanicalAchievementsModal: React.FC<BotanicalAchievementsModalProps> = ({
  isOpen,
  onClose,
  userStats,
}) => {
  const achievements: BotanicalAchievement[] = useMemo(() => {
    const streak = userStats.streakDays || 0;
    const rescues = userStats.rescuesCount || 0;
    const waterings = userStats.wateringCount || 0;
    const climateLogs = userStats.climateLogsCount || 0;
    const synergy = userStats.synergyRunsCount || 0;
    const qrScans = userStats.qrScansCount || 0;
    const arCount = userStats.arSnapshotsCount || 0;
    const shares = userStats.sharesCount || 0;

    return [
      {
        id: 'master-botanist',
        title: 'Master Botanist',
        description: 'Maintain a consistent 30-day plant care & watering streak.',
        badgeColor: 'from-[#F5CA62] to-[#174C38]',
        category: 'Streak',
        progressCurrent: Math.min(30, streak),
        progressTarget: 30,
        unlocked: streak >= 30,
        rewardXp: 500,
      },
      {
        id: 'plant-rescuer',
        title: 'Botanical Rescuer',
        description: 'Successfully diagnose and treat a stressed or dying plant specimen.',
        badgeColor: 'from-[#00D69A] to-[#174C38]',
        category: 'Rescue',
        progressCurrent: Math.min(1, rescues > 0 ? 1 : 0),
        progressTarget: 1,
        unlocked: rescues > 0,
        rewardXp: 300,
      },
      {
        id: 'green-thumb',
        title: 'Dedicated Caretaker',
        description: 'Complete 10 watering and care maintenance logs.',
        badgeColor: 'from-[#00D69A] to-[#C7F36B]',
        category: 'Care',
        progressCurrent: Math.min(10, waterings),
        progressTarget: 10,
        unlocked: waterings >= 10,
        rewardXp: 200,
      },
      {
        id: 'microclimate-expert',
        title: 'Micro-Climate Sage',
        description: 'Log indoor humidity and light intensity readings 5 times.',
        badgeColor: 'from-[#56C7C0] to-[#174C38]',
        category: 'Intelligence',
        progressCurrent: Math.min(5, climateLogs),
        progressTarget: 5,
        unlocked: climateLogs >= 5,
        rewardXp: 250,
      },
      {
        id: 'ecosystem-harmonizer',
        title: 'Ecosystem Harmonizer',
        description: 'Analyze companion planting synergy to optimize garden layouts.',
        badgeColor: 'from-[#BBA8F5] to-[#174C38]',
        category: 'Intelligence',
        progressCurrent: Math.min(1, synergy),
        progressTarget: 1,
        unlocked: synergy >= 1,
        rewardXp: 150,
      },
      {
        id: 'qr-nursery-scout',
        title: 'Nursery QR Scout',
        description: 'Import specimens via nursery QR tags or garden registration.',
        badgeColor: 'from-[#C7F36B] to-[#174C38]',
        category: 'Care',
        progressCurrent: Math.min(1, qrScans),
        progressTarget: 1,
        unlocked: qrScans >= 1,
        rewardXp: 150,
      },
      {
        id: 'ar-pioneer',
        title: 'AR Sanctuary Pioneer',
        description: 'Project 3D virtual plants into your room using AR camera mode.',
        badgeColor: 'from-[#FF806B] to-[#174C38]',
        category: 'AR',
        progressCurrent: Math.min(1, arCount),
        progressTarget: 1,
        unlocked: arCount >= 1,
        rewardXp: 200,
      },
      {
        id: 'social-sprout',
        title: 'Social Botanist',
        description: 'Share botanical milestones and growth progress cards.',
        badgeColor: 'from-[#FF806B] to-[#F5CA62]',
        category: 'Social',
        progressCurrent: Math.min(1, shares),
        progressTarget: 1,
        unlocked: shares >= 1,
        rewardXp: 150,
      },
    ];
  }, [userStats]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXp = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.rewardXp, 0);

  const handleShareAchievement = async (ach: BotanicalAchievement) => {
    await SocialShareService.shareCard({
      category: 'achievement',
      title: `Unlocked Badge: ${ach.title}`,
      summaryText: `${ach.description} (+${ach.rewardXp} XP)`,
      metrics: [
        { label: 'Unlocked Badges', value: `${unlockedCount}/${achievements.length}` },
        { label: 'Total XP', value: `${totalXp} XP` },
      ],
    });
    emitGreenyAppEvent({ type: 'USER_COMPLETED_WATERING', plantName: ach.title });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#10251D]/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Botanical Achievements"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF7EE] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/40 rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8 space-y-6 text-[#10251D] dark:text-[#FAF7EE]"
          >
          <div className="flex items-center justify-between border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#0F6B50] dark:text-[#00D69A] font-mono uppercase tracking-[0.18em] text-[11px] font-semibold">
                <Trophy className="w-4 h-4" />
                <span>Sanctuary Honors & Progression</span>
              </div>
              <h2 className="text-2xl font-display font-extrabold">Botanical Achievements</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close achievements modal"
              className="p-2 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-2xl p-5 bg-[#10251D] text-[#FAF7EE] border border-[#00D69A]/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#00D69A]/20 border border-[#00D69A]/45 flex items-center justify-center text-[#C7F36B]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#B6CDB4]">Unlocked Badges</div>
                <div className="text-2xl font-display font-extrabold tabular-nums">
                  {unlockedCount} / {achievements.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:border-l sm:border-[#FAF7EE]/15 sm:pl-5">
              <div className="w-12 h-12 rounded-2xl bg-[#F5CA62]/20 border border-[#F5CA62]/40 flex items-center justify-center text-[#F5CA62]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#F5CA62]">Total Botanist XP</div>
                <div className="text-2xl font-display font-extrabold text-[#FAF7EE] tabular-nums">{totalXp} XP</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((ach) => {
              const percent = Math.round((ach.progressCurrent / ach.progressTarget) * 100);
              return (
                <div
                  key={ach.id}
                  className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                    ach.unlocked
                      ? 'bg-white dark:bg-[#10251D] border-[#00D69A]/45 shadow-sm'
                      : 'bg-[#F1ECE0]/70 dark:bg-[#10251D]/60 border-[#174C38]/12 dark:border-[#B6CDB4]/14 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${ach.badgeColor} flex items-center justify-center text-white shadow-sm shrink-0 ${
                        ach.unlocked ? '' : 'grayscale opacity-60'
                      }`}
                    >
                      {ach.unlocked ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-sm truncate">{ach.title}</h3>
                        <span className="text-[11px] font-mono font-bold text-[#0F6B50] dark:text-[#00D69A] shrink-0">
                          +{ach.rewardXp} XP
                        </span>
                      </div>
                      <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-0.5 line-clamp-2">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className={ach.unlocked ? 'text-[#0F6B50] dark:text-[#00D69A] font-bold' : 'text-[#4A665B] dark:text-[#B6CDB4]'}>
                        {ach.unlocked ? 'Unlocked' : `${ach.progressCurrent} / ${ach.progressTarget}`}
                      </span>
                      <span className="text-[#4A665B] dark:text-[#B6CDB4]">{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E9F0E6] dark:bg-[#153026] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          ach.unlocked ? 'bg-gradient-to-r from-[#00D69A] to-[#C7F36B]' : 'bg-[#B6CDB4]/60'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    {ach.unlocked && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleShareAchievement(ach)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00D69A]/14 border border-[#00D69A]/35 text-[11px] font-semibold text-[#0F6B50] dark:text-[#00D69A] hover:bg-[#00D69A]/25 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" /> Share Badge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
