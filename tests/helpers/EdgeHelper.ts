import * as request from "supertest";

export default class EdgeHelper {

  public static async requestWithoutJWT(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(401);
  }

  public static async requestWithInvalidDto(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(400);
    expect(answer.body.message).toBe("Validation failed");
  }

  public static async entityNotFound(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(404);
  }

  public static async entityNotReachable(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(401);
  }

  public static async roleGuardError(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(403);
  }

  public static async entityAlreadyExists(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(422);
  }

  public static async quantityStringNotValid(request: request.Test): Promise<void> {
    const answer = await request;
    expect(answer.status).toBe(422);
    expect(answer.body.message).toBe("quantity_string_not_valid");
  }
}