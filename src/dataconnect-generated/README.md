# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListTrainers*](#listtrainers)
  - [*GetMyReviews*](#getmyreviews)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)
  - [*CreateReservation*](#createreservation)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListTrainers
You can execute the `ListTrainers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTrainers(): QueryPromise<ListTrainersData, undefined>;

interface ListTrainersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTrainersData, undefined>;
}
export const listTrainersRef: ListTrainersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTrainers(dc: DataConnect): QueryPromise<ListTrainersData, undefined>;

interface ListTrainersRef {
  ...
  (dc: DataConnect): QueryRef<ListTrainersData, undefined>;
}
export const listTrainersRef: ListTrainersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTrainersRef:
```typescript
const name = listTrainersRef.operationName;
console.log(name);
```

### Variables
The `ListTrainers` query has no variables.
### Return Type
Recall that executing the `ListTrainers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTrainersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListTrainers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTrainers } from '@dataconnect/generated';


// Call the `listTrainers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTrainers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTrainers(dataConnect);

console.log(data.trainerProfiles);

// Or, you can use the `Promise` API.
listTrainers().then((response) => {
  const data = response.data;
  console.log(data.trainerProfiles);
});
```

### Using `ListTrainers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTrainersRef } from '@dataconnect/generated';


// Call the `listTrainersRef()` function to get a reference to the query.
const ref = listTrainersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTrainersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.trainerProfiles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.trainerProfiles);
});
```

## GetMyReviews
You can execute the `GetMyReviews` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyReviews(): QueryPromise<GetMyReviewsData, undefined>;

interface GetMyReviewsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyReviewsData, undefined>;
}
export const getMyReviewsRef: GetMyReviewsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyReviews(dc: DataConnect): QueryPromise<GetMyReviewsData, undefined>;

interface GetMyReviewsRef {
  ...
  (dc: DataConnect): QueryRef<GetMyReviewsData, undefined>;
}
export const getMyReviewsRef: GetMyReviewsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyReviewsRef:
```typescript
const name = getMyReviewsRef.operationName;
console.log(name);
```

### Variables
The `GetMyReviews` query has no variables.
### Return Type
Recall that executing the `GetMyReviews` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyReviewsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMyReviews`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyReviews } from '@dataconnect/generated';


// Call the `getMyReviews()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyReviews();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyReviews(dataConnect);

console.log(data.reviews);

// Or, you can use the `Promise` API.
getMyReviews().then((response) => {
  const data = response.data;
  console.log(data.reviews);
});
```

### Using `GetMyReviews`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyReviewsRef } from '@dataconnect/generated';


// Call the `getMyReviewsRef()` function to get a reference to the query.
const ref = getMyReviewsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyReviewsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.reviews);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.reviews);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation has no variables.
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser } from '@dataconnect/generated';


// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser().then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef } from '@dataconnect/generated';


// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateReservation
You can execute the `CreateReservation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createReservation(vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface CreateReservationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
}
export const createReservationRef: CreateReservationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createReservation(dc: DataConnect, vars: CreateReservationVariables): MutationPromise<CreateReservationData, CreateReservationVariables>;

interface CreateReservationRef {
  ...
  (dc: DataConnect, vars: CreateReservationVariables): MutationRef<CreateReservationData, CreateReservationVariables>;
}
export const createReservationRef: CreateReservationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createReservationRef:
```typescript
const name = createReservationRef.operationName;
console.log(name);
```

### Variables
The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateReservationVariables {
  trainerId: UUIDString;
  reservationDate: DateString;
  startTime: string;
  endTime: string;
  status: string;
}
```
### Return Type
Recall that executing the `CreateReservation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateReservationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateReservationData {
  reservation_insert: Reservation_Key;
}
```
### Using `CreateReservation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createReservation, CreateReservationVariables } from '@dataconnect/generated';

// The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`:
const createReservationVars: CreateReservationVariables = {
  trainerId: ..., 
  reservationDate: ..., 
  startTime: ..., 
  endTime: ..., 
  status: ..., 
};

// Call the `createReservation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createReservation(createReservationVars);
// Variables can be defined inline as well.
const { data } = await createReservation({ trainerId: ..., reservationDate: ..., startTime: ..., endTime: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createReservation(dataConnect, createReservationVars);

console.log(data.reservation_insert);

// Or, you can use the `Promise` API.
createReservation(createReservationVars).then((response) => {
  const data = response.data;
  console.log(data.reservation_insert);
});
```

### Using `CreateReservation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createReservationRef, CreateReservationVariables } from '@dataconnect/generated';

// The `CreateReservation` mutation requires an argument of type `CreateReservationVariables`:
const createReservationVars: CreateReservationVariables = {
  trainerId: ..., 
  reservationDate: ..., 
  startTime: ..., 
  endTime: ..., 
  status: ..., 
};

// Call the `createReservationRef()` function to get a reference to the mutation.
const ref = createReservationRef(createReservationVars);
// Variables can be defined inline as well.
const ref = createReservationRef({ trainerId: ..., reservationDate: ..., startTime: ..., endTime: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createReservationRef(dataConnect, createReservationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.reservation_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.reservation_insert);
});
```

