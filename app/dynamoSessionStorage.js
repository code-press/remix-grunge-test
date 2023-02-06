import * as crypto from "crypto";
import { createSessionStorage } from "@remix-run/node";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Session storage using a DynamoDB.
 *
 * Add the following lines to your project's `app.arc` file:
 *
 *   @tables
 *   arc-sessions
 *     _idx *String
 *     _ttl TTL
 */
export function createDynamoTableSessionStorage({ cookie, ...props }) {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const marshallOptions = {
    removeUndefinedValues: true,
  };
  const translateConfig = { marshallOptions };
  const ddbDocClient = DynamoDBDocumentClient.from(client, translateConfig);
  const tableName = props.table;

  return createSessionStorage({
    cookie,
    async createData(data, expires) {
      while (true) {
        let randomBytes = crypto.randomBytes(8);
        // This storage manages an id space of 2^64 ids, which is far greater
        // than the maximum number of files allowed on an NTFS or ext4 volume
        // (2^32). However, the larger id space should help to avoid collisions
        // with existing ids when creating new sessions, which speeds things up.
        let id = [...randomBytes]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");

        let getData = await ddbDocClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              [props.idx]: id,
            },
          })
        );
        if (getData.Item) {
          continue;
        }

        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              [props.idx]: id,
              [props.ttl]: expires
                ? Math.round(expires.getTime() / 1000)
                : undefined,
              ...data,
            },
          })
        );

        return id;
      }
    },
    async readData(id) {
      const data = await ddbDocClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            [props.idx]: id,
          },
        })
      );
      if (data.Item) {
        delete data.Item[props.idx];
        if (props.ttl) delete data.Item[props.ttl];
      }
      return data.Item;
    },
    async updateData(id, data, expires) {
      await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            [props.idx]: id,
            [props.ttl]: expires
              ? Math.round(expires.getTime() / 1000)
              : undefined,
            ...data,
          },
        })
      );
    },
    async deleteData(id) {
      await ddbDocClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            [props.idx]: id,
          },
        })
      );
    },
  });
}
