import ProductEditor from './ProductEditor.jsx';

/**
 * Para compatibilidade retroativa, ProductEditorModal exporta ProductEditor.
 * A experiência de edição agora é fluída e integrada como página, sem modais.
 */
export default function ProductEditorModal({ product, onClose, onSaved }) {
  return (
    <ProductEditor
      product={product}
      onBack={onClose}
      onSaved={onSaved}
    />
  );
}
