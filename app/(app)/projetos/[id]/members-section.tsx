"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { addMemberAction, removeMemberAction, type ActionResult } from "../actions";

export type MemberItem = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
};

function AddMemberForm({
  projectId,
  availableUsers,
  onSuccess,
}: {
  projectId: string;
  availableUsers: MemberItem[];
  onSuccess: () => void;
}) {
  const boundAction = React.useMemo(
    () => addMemberAction.bind(null, projectId),
    [projectId],
  );
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    boundAction,
    null,
  );

  React.useEffect(() => {
    if (state?.ok) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}
      <Field label="Usuário" htmlFor="add-member-user" required error={state?.fieldErrors?.userId}>
        <Select id="add-member-user" name="userId" defaultValue="" required>
          <option value="">Selecione um usuário</option>
          {availableUsers.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.fullName}
              {user.position ? ` — ${user.position}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={isPending}>
          Adicionar membro
        </Button>
      </div>
    </form>
  );
}

export function MembersSection({
  projectId,
  members,
  availableUsers,
  canManage,
}: {
  projectId: string;
  members: MemberItem[];
  availableUsers: MemberItem[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isRemoving, startRemove] = useTransition();
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const closeDialog = React.useCallback(() => setDialogOpen(false), []);

  const handleRemove = (userId: string) => {
    setError(null);
    setRemovingId(userId);
    startRemove(async () => {
      const result = await removeMemberAction(projectId, userId);
      if (!result.ok) setError(result.message ?? "Não foi possível remover o membro.");
      setRemovingId(null);
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-neon" aria-hidden />
          Membros ({members.length})
        </CardTitle>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {members.length === 0 ? (
          <p className="text-sm text-muted">Nenhum membro na equipe deste projeto.</p>
        ) : (
          <ul className="space-y-1" role="list">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-card-hover"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{member.fullName}</span>
                    {member.position && (
                      <span className="block truncate text-xs text-muted">{member.position}</span>
                    )}
                  </span>
                </span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleRemove(member.userId)}
                    disabled={isRemoving}
                    loading={isRemoving && removingId === member.userId}
                    aria-label={`Remover ${member.fullName} do projeto`}
                    className="text-muted hover:text-danger"
                  >
                    {!(isRemoving && removingId === member.userId) && (
                      <UserMinus className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="Adicionar membro"
        description="Selecione um usuário ativo para entrar na equipe do projeto."
      >
        {availableUsers.length === 0 ? (
          <p className="text-sm text-muted">
            Todos os usuários ativos já fazem parte deste projeto.
          </p>
        ) : (
          <AddMemberForm
            projectId={projectId}
            availableUsers={availableUsers}
            onSuccess={closeDialog}
          />
        )}
      </Dialog>
    </Card>
  );
}
