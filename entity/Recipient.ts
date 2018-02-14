import { Entity, ManyToOne, CreateDateColumn, PrimaryGeneratedColumn, Column } from "typeorm";
import { Message } from "./Message";
import { User } from "./User";

interface RecipientConstructor {
  user?: User;
  message?: Message;
  receivedAt?: string;
  readAt?: string;
}

@Entity()
export class Recipient {
  constructor({user, message, receivedAt, readAt}: RecipientConstructor = {}) {
    if (user) {
      this.user = user;
    }
    if (message) {
      this.message = message;
    }
    if (receivedAt) {
      this.receivedAt = receivedAt;
    }
    if (readAt) {
      this.readAt = readAt;
    }
  }

  @ManyToOne(type => User, user => user.recipients, { primary: true })
  user: User;

  @ManyToOne(type => Message, message => message.recipients, { primary: true })
  message: Message;

  @Column({ type: "time without time zone", nullable: true})
  receivedAt: string;

  @Column({ type: "time without time zone", nullable: true})
  readAt: string;
}
