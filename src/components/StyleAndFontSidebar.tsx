import React from 'react';
import { FontOption } from '../utils/fontLoader';
import { StyleRecipe } from '../utils/styleRecipe';
import { FontPanel } from './sidebar/FontPanel';
import { PresetPanel } from './sidebar/PresetPanel';
import { ShaderPanel } from './sidebar/ShaderPanel';
import { GradientPanel } from './sidebar/GradientPanel';

interface StyleAndFontSidebarProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
  fontOptions: FontOption[];
  onAddFontOption: (opt: FontOption) => void;
  customPresets: StyleRecipe[];
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  onNotice: (msg: string) => void;
}

export const StyleAndFontSidebar: React.FC<StyleAndFontSidebarProps> = ({
  recipe,
  onChangeRecipe,
  fontOptions,
  onAddFontOption,
  customPresets,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onNotice,
}) => {
  return (
    <aside className="space-y-5">
      <FontPanel
        recipe={recipe}
        onChangeRecipe={onChangeRecipe}
        fontOptions={fontOptions}
        onAddFontOption={onAddFontOption}
        onNotice={onNotice}
      />
      <PresetPanel
        recipe={recipe}
        onChangeRecipe={onChangeRecipe}
        customPresets={customPresets}
        onSaveCustomPreset={onSaveCustomPreset}
        onDeleteCustomPreset={onDeleteCustomPreset}
        onNotice={onNotice}
      />
      <ShaderPanel recipe={recipe} onChangeRecipe={onChangeRecipe} />
      <GradientPanel recipe={recipe} onChangeRecipe={onChangeRecipe} />
    </aside>
  );
};
