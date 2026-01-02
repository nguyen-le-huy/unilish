import { useState } from 'react'
import { BellIcon, CircleIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

const notifications = [
  {
    id: 1,
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    message: 'Bạn đã hoàn thành bài học Speaking với điểm 85/100',
    fallback: 'UN',
    time: '15 phút'
  },
  {
    id: 2,
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    message: 'Chúc mừng! Bạn đã lên Top 10 bảng xếp hạng tuần',
    fallback: 'UL',
    time: '35 phút'
  },
  {
    id: 3,
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    message: 'Có bài học mới: Giao tiếp tại nhà hàng',
    fallback: 'BH',
    time: '3 ngày'
  }
]

const NotificationButton = () => {
  const [readMessages, setReadMessages] = useState<number[]>([3])

  const unreadCount = notifications.filter(n => !readMessages.includes(n.id)).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='relative h-8 w-8 sm:h-9 sm:w-9'
        >
          <BellIcon className='h-4 w-4' />
          {unreadCount > 0 && (
            <span className='absolute -top-0.5 -right-0.5 size-2 animate-bounce rounded-full bg-sky-600 dark:bg-sky-400' />
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[calc(100vw-2rem)] sm:w-80 p-0' align="end">
        <div className='grid'>
          <div className='flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5'>
            <span className='font-medium text-sm sm:text-base'>Thông báo</span>
            <Button
              variant='secondary'
              className='h-6 sm:h-7 rounded-full px-2 py-1 text-[10px] sm:text-xs'
              onClick={() => setReadMessages(notifications.map(item => item.id))}
            >
              Đánh dấu đã đọc
            </Button>
          </div>
          <Separator />
          <ul className='grid gap-1 p-1.5 sm:p-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto'>
            {notifications.map(item => (
              <li
                key={item.id}
                className={`hover:bg-accent flex items-start gap-2 sm:gap-3 rounded-lg px-2 py-1.5 sm:py-2 cursor-pointer transition-colors ${!readMessages.includes(item.id) ? 'bg-accent/50' : ''}`}
                onClick={() => setReadMessages(prev => [...prev, item.id])}
              >
                <Avatar className='h-7 w-7 sm:h-9 sm:w-9 border shrink-0'>
                  <AvatarImage src={item.image} alt={item.fallback} />
                  <AvatarFallback className="text-xs">{item.fallback}</AvatarFallback>
                </Avatar>
                <div className='flex-1 space-y-0.5 sm:space-y-1 min-w-0'>
                  <div className={`text-xs sm:text-sm line-clamp-2 ${!readMessages.includes(item.id) ? 'font-semibold' : 'font-medium'}`}>
                    {item.message}
                  </div>
                  <p className='text-muted-foreground text-[10px] sm:text-xs'>{item.time} trước</p>
                </div>
                {!readMessages.includes(item.id) && (
                  <CircleIcon className='fill-primary text-primary size-2 self-center shrink-0' />
                )}
              </li>
            ))}
            {notifications.length === 0 && (
              <li className="text-center text-xs sm:text-sm text-muted-foreground py-4">
                Không có thông báo mới
              </li>
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationButton
