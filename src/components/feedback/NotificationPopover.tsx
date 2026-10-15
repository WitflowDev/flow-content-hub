function NotificationItem({ title, copy, time, unread }: { title: string; copy: string; time: string; unread: boolean }) {
  return (
    <div className="notification">
      <span className={unread ? 'dot on' : 'dot'} />
      <div>
        <p><b>{title}</b>{copy}</p>
        <small>{time}</small>
      </div>
    </div>
  )
}

export function NotificationPopover() {
  return (
    <div className="popover notification-pop">
      <div className="popover-head">
        <h3>Notifications</h3>
        <button type="button" className="text-btn">
          Mark all read
        </button>
      </div>
      <NotificationItem title="New files added" copy="6 new assets were added to Summer Content Day." time="12 min" unread />
      <NotificationItem title="Collection ready" copy="Summer Content Day is ready to download." time="Yesterday" unread />
      <NotificationItem title="Flow Tip" copy="Your latest videos can also work for paid media." time="2 days" unread={false} />
    </div>
  )
}
