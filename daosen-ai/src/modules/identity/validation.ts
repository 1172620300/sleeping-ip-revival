import { z } from "zod";

const email = z.string().trim().toLowerCase().email("请输入有效邮箱").max(254, "邮箱不能超过 254 位");

// bcrypt only consumes the first 72 bytes: reject, rather than silently truncate.
const password = z.string().min(12, "密码至少 12 位").max(72, "密码最多 72 字节")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "密码 UTF-8 编码不能超过 72 字节");

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "姓名至少 2 位").max(60, "姓名不能超过 60 位"),
  email,
  password,
  role: z.enum(["DESIGNER", "STORE_OWNER"]).default("DESIGNER"),
  phone: z.string().trim().max(30, "联系方式不能超过 30 位").optional(),
  purpose: z.string().trim().max(300, "使用目的不能超过 300 位").optional(),
}).strict();

export const loginSchema = z.object({ email, password });
export type RegistrationInput = z.infer<typeof registrationSchema>;
