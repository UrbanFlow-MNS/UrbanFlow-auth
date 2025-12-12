import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRoleType } from '../enums/user-role.enum';

@Entity()
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ type: 'enum', enum: UserRoleType })
  role: UserRoleType;

  @Column({ unique: true })
  email: string

  @Column()
  @Exclude()
  password: string

  @Column({ nullable: true })
  refreshToken?: string

  @CreateDateColumn()
  createdAt: Date

}