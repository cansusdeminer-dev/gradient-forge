import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MODULE_CATEGORIES } from '@/lib/modules';

interface AddModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddModule: (moduleType: string) => void;
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  generator: { label: 'Generators', color: 'hsl(180 100% 50%)', icon: '⚡' },
  modifier: { label: 'Modifiers', color: 'hsl(300 100% 60%)', icon: '⟲' },
  fx: { label: 'Effects', color: 'hsl(45 100% 55%)', icon: '✦' },
  physics: { label: 'Physics / Simulation', color: 'hsl(160 100% 45%)', icon: '🧬' },
  utility: { label: 'Utilities', color: 'hsl(120 100% 45%)', icon: '◎' },
};

const AddModuleDialog: React.FC<AddModuleDialogProps> = ({ open, onOpenChange, onAddModule }) => {
  const handleSelect = (moduleType: string) => {
    onAddModule(moduleType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border p-0 max-w-md overflow-hidden">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search modules..."
            className="border-b border-border h-10 text-xs"
          />
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              No modules found.
            </CommandEmpty>
            {Object.entries(MODULE_CATEGORIES).map(([category, modules]) => {
              const meta = CATEGORY_META[category];
              if (!meta || modules.length === 0) return null;
              return (
                <CommandGroup
                  key={category}
                  heading={
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: meta.color }}>{meta.icon}</span>
                      <span style={{ color: meta.color }} className="text-[10px] uppercase tracking-widest font-bold">
                        {meta.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground/40 ml-1">({modules.length})</span>
                    </span>
                  }
                >
                  {modules.map(m => (
                    <CommandItem
                      key={m.id}
                      value={`${m.name} ${category}`}
                      onSelect={() => handleSelect(m.id)}
                      className="text-xs cursor-pointer flex items-center gap-2 py-2"
                    >
                      <span className="text-sm opacity-50">{m.icon}</span>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[8px] text-muted-foreground/40 ml-auto">
                        {m.inputs.length > 0 ? `${m.inputs.length}in` : ''} {m.outputs.length > 0 ? `${m.outputs.length}out` : ''}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default AddModuleDialog;
