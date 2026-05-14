import { TicketTable } from "./TicketTable";
import { TicketCards } from "./TicketCards";
import type { Ticket } from "./filterTickets";
import styles from "./InboxList.module.css";

interface InboxListProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function InboxList({ tickets, onPick }: InboxListProps) {
  return (
    <>
      <div className={styles.desktop}>
        <TicketTable tickets={tickets} onPick={onPick} />
      </div>
      <div className={styles.mobile}>
        <TicketCards tickets={tickets} onPick={onPick} />
      </div>
    </>
  );
}
