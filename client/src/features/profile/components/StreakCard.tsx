import { getStoredUser } from "@/features/auth/hooks/useAuthSync";
import FireIcon from "@/assets/fire.svg";

export function StreakCard() {
    const localUser = getStoredUser();
    const userStreak = localUser?.stats?.streak || 0;

    return (
        <div className="relative w-full sm:w-[180px] h-[180px] bg-[#FFD028] dark:bg-[#FFD028] rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-default">
            {/* Text Info */}
            <div className="absolute top-7 left-7 z-10 flex flex-col select-none">
                <span className="text-6xl font-extrabold text-slate-900 leading-none tracking-tighter">
                    {userStreak}
                </span>
                <span className="text-lg font-bold text-slate-900 mt-2 tracking-tight">Streak Days</span>
            </div>

            {/* Flame SVG */}
            <div className="absolute bottom-[-15%] -right-4 sm:-right-14 w-[250px] h-[140%] rotate-[-12deg] translate-y-4">
                <img src={FireIcon} alt="Fire Icon" className="w-full h-full drop-shadow-2xl" />
            </div>
        </div>
    );
}
