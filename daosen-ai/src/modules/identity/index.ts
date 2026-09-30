import { createIdentityService } from "./service";
import { identityRepository } from "./repository";

export const identity = createIdentityService(identityRepository);
