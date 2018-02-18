import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { Message } from "./Message";
import { User } from "./User";

interface ChatConstructor {
  name?: string;
  picture?: string;
  allTimeMembers?: User[];
  listingMembers?: User[];
  actualGroupMembers?: User[];
  admins?: User[];
  owner?: User;
  messages?: Message[];
}

@Entity()
export class Chat {
  constructor({name, picture, allTimeMembers, listingMembers, actualGroupMembers, admins, owner, messages}: ChatConstructor = {}) {
    if (name) {
      this.name = name;
    }
    if (picture) {
      this.picture = picture;
    }
    if (allTimeMembers) {
      this.allTimeMembers = allTimeMembers;
    }
    if (listingMembers) {
      this.listingMembers = listingMembers;
    }
    if (actualGroupMembers) {
      this.actualGroupMembers = actualGroupMembers;
    }
    if (admins) {
      this.admins = admins;
    }
    if (owner) {
      this.owner = owner;
    }
    if (messages) {
      this.messages = messages;
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  name: string;

  @Column({nullable: true})
  picture: string;

  @ManyToMany(type => User, user => user.allTimeMemberChats, {cascade: true, eager: false})
  @JoinTable()
  allTimeMembers: User[];

  @ManyToMany(type => User, user => user.listingMemberChats, {cascade: true, eager: false})
  @JoinTable()
  listingMembers: User[];

  @ManyToMany(type => User, user => user.actualGroupMemberChats, {cascade: true, eager: false})
  @JoinTable()
  actualGroupMembers?: User[];

  @ManyToMany(type => User, user => user.adminChats, {cascade: true, eager: false})
  @JoinTable()
  admins?: User[];

  @ManyToOne(type => User, user => user.ownerChats, {cascade: true, eager: false})
  owner?: User | null;

  @OneToMany(type => Message, message => message.chat, {cascade: true, eager: true})
  messages: Message[];
}