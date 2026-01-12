import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Availability_Key {
  id: UUIDString;
  __typename?: 'Availability_Key';
}

export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}

export interface CreateReservationVariables {
  trainerId: UUIDString;
  reservationDate: DateString;
  startTime: string;
  endTime: string;
  status: string;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface GetMyReviewsData {
  reviews: ({
    id: UUIDString;
    trainer: {
      user: {
        displayName: string;
      };
    };
      comment?: string | null;
      rating: number;
  } & Review_Key)[];
}

export interface ListTrainersData {
  trainerProfiles: ({
    id: UUIDString;
    user: {
      displayName: string;
      email: string;
    };
      experienceYears?: number | null;
      hourlyRate: number;
      location: string;
  } & TrainerProfile_Key)[];
}

export interface Reservation_Key {
  id: UUIDString;
  __typename?: 'Reservation_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface TrainerProfile_Key {
  id: UUIDString;
  __typename?: 'TrainerProfile_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(): MutationPromise<CreateUserData, undefined>;
export function createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface ListTrainersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTrainersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTrainersData, undefined>;
  operationName: string;
}
export const listTrainersRef: ListTrainersRef;

export function listTrainers(): QueryPromise<ListTrainersData, undefined>;
export function listTrainers(dc: DataConnect): QueryPromise<ListTrainersData, undefined>;

interface CreateReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
  operationName: string;
}
export const createReservationRef: CreateReservationRef;

export function createReservation(vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;
export function createReservation(dc: DataConnect, vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface GetMyReviewsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyReviewsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyReviewsData, undefined>;
  operationName: string;
}
export const getMyReviewsRef: GetMyReviewsRef;

export function getMyReviews(): QueryPromise<GetMyReviewsData, undefined>;
export function getMyReviews(dc: DataConnect): QueryPromise<GetMyReviewsData, undefined>;

