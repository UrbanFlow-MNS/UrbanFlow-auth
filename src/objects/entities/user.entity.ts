import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRoleType } from '../enums/user-role.enum';
import { Exclude } from 'class-transformer';

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

}