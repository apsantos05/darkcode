"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission } from "@/lib/rbac";
import { logActivity, notify } from "@/lib/activity";
import { goalSchema } from "@/lib/validators/objectives";
export type ObjectiveActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };
const text = (f: FormData, k: string) => typeof f.get(k) === "string" ? String(f.get(k)) : "";
const parse = (f: FormData) => goalSchema.safeParse({ title: text(f,"title"), description: text(f,"description"), metric: text(f,"metric"), unit: text(f,"unit"), targetValue: text(f,"targetValue"), currentValue: text(f,"currentValue"), status: text(f,"status"), ownerId: text(f,"ownerId"), startDate: text(f,"startDate"), dueDate: text(f,"dueDate") });
async function validateOwner(id?: string) { return !id || Boolean(await db.user.findFirst({ where: { id, status: "ACTIVE", deletedAt: null }, select: { id: true } })); }
export async function createGoalAction(_p: ObjectiveActionResult | null, formData: FormData): Promise<ObjectiveActionResult> {
  const user=await requireUser(); assertPermission(user.role,"goals.manage"); const parsed=parse(formData);
  if(!parsed.success) return {ok:false,fieldErrors:parsed.error.flatten().fieldErrors as Record<string,string[]>}; const data=parsed.data;
  if(!await validateOwner(data.ownerId)) return {ok:false,fieldErrors:{ownerId:["Responsável inválido"]}};
  const goal=await db.goal.create({data:{...data,creatorId:user.id}}); await logActivity({actorId:user.id,entityType:"GOAL",entityId:goal.id,action:"CREATED",message:`Meta "${goal.title}" criada`});
  if(goal.ownerId&&goal.ownerId!==user.id) await notify({userId:goal.ownerId,type:"GOAL_UPDATED",title:"Nova meta sob sua responsabilidade",body:goal.title,link:"/metas"}); revalidatePath("/metas"); redirect("/metas");
}
export async function updateGoalAction(id:string,_p:ObjectiveActionResult|null,formData:FormData):Promise<ObjectiveActionResult>{
 const user=await requireUser();assertPermission(user.role,"goals.manage");const old=await db.goal.findFirst({where:{id,archivedAt:null}});if(!old)return{ok:false,message:"Meta não encontrada."};const parsed=parse(formData);if(!parsed.success)return{ok:false,fieldErrors:parsed.error.flatten().fieldErrors as Record<string,string[]>};const data=parsed.data;if(!await validateOwner(data.ownerId))return{ok:false,fieldErrors:{ownerId:["Responsável inválido"]}};await db.goal.update({where:{id},data});await logActivity({actorId:user.id,entityType:"GOAL",entityId:id,action:"UPDATED",message:`Meta "${data.title}" atualizada`,oldValue:{status:old.status,currentValue:old.currentValue},newValue:{status:data.status,currentValue:data.currentValue}});if(data.ownerId&&data.ownerId!==user.id)await notify({userId:data.ownerId,type:"GOAL_UPDATED",title:"Meta atualizada",body:data.title,link:"/metas"});revalidatePath("/metas");redirect("/metas");
}
export async function archiveGoalAction(id:string):Promise<ObjectiveActionResult>{const user=await requireUser();assertPermission(user.role,"goals.manage");const goal=await db.goal.findFirst({where:{id,archivedAt:null}});if(!goal)return{ok:false,message:"Meta não encontrada."};await db.goal.update({where:{id},data:{archivedAt:new Date()}});await logActivity({actorId:user.id,entityType:"GOAL",entityId:id,action:"ARCHIVED",message:`Meta "${goal.title}" arquivada`});revalidatePath("/metas");return{ok:true,message:"Meta arquivada."};}
