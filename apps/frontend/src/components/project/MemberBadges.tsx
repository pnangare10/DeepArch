import { useStore } from '../../store';

export function MemberBadges() {
  const onlineUsers = useStore((s) => s.onlineUsers);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {onlineUsers.slice(0, 5).map((user) => (
        <div
          key={user.userId}
          title={user.name}
          style={{ backgroundColor: user.color }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white -ml-1 first:ml-0 cursor-default"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {onlineUsers.length > 5 && (
        <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white -ml-1 cursor-default">
          +{onlineUsers.length - 5}
        </div>
      )}
    </div>
  );
}
