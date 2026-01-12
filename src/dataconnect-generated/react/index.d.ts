import { CreateUserData, ListTrainersData, CreateReservationData, CreateReservationVariables, GetMyReviewsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;

export function useListTrainers(options?: useDataConnectQueryOptions<ListTrainersData>): UseDataConnectQueryResult<ListTrainersData, undefined>;
export function useListTrainers(dc: DataConnect, options?: useDataConnectQueryOptions<ListTrainersData>): UseDataConnectQueryResult<ListTrainersData, undefined>;

export function useCreateReservation(options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;
export function useCreateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;

export function useGetMyReviews(options?: useDataConnectQueryOptions<GetMyReviewsData>): UseDataConnectQueryResult<GetMyReviewsData, undefined>;
export function useGetMyReviews(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyReviewsData>): UseDataConnectQueryResult<GetMyReviewsData, undefined>;
