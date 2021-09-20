import Role from "./role.enum";

export const isValidRole = (roleToTest: string): boolean => {
  return (<any>Object).values(Role).includes(roleToTest);
};