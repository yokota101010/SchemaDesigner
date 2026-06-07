export const generateSQL = (tables, relationships) => {
  let sql = '';
  
  // 複合外部キーに対応した外部キー制約の抽出
  const tableFks = []; 
  relationships.forEach(rel => {
      if (rel.mappings && rel.mappings.length > 0) {
          const parentTable = tables.find(t => t.id === rel.from);
          const childTable = tables.find(t => t.id === rel.to);
          
          if (parentTable && childTable) {
              const mappings = [];
              rel.mappings.forEach(m => {
                  const parentCol = parentTable.columns.find(c => c.id === m.parentColId);
                  const childCol = childTable.columns.find(c => c.id === m.childColId);
                  if (parentCol && childCol) {
                      mappings.push({
                          parentColName: parentCol.name,
                          childColName: childCol.name
                      });
                  }
              });

              if (mappings.length > 0) {
                  tableFks.push({
                      fromTable: childTable.name,  // 子テーブル
                      toTable: parentTable.name,   // 親テーブル
                      mappings: mappings
                  });
              }
          }
      }
  });

  tables.forEach(table => {
    sql += `CREATE TABLE ${table.name} (\n`;
    
    const colDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (col.attributeType === 'dependent') {
          const derivation = col.derivation ? ` [${col.derivation}]` : '';
          def += ` /* Derived (導出項目)${derivation} */`;
      }
      return def;
    });

    const pkCols = table.columns.filter(c => c.isPk);
    if (pkCols.length > 0) {
        const pkNames = pkCols.map(c => c.name).join(', ');
        colDefs.push(`  PRIMARY KEY (${pkNames})`);
    }

    if (table.uniqueKeys && table.uniqueKeys.length > 0) {
        table.uniqueKeys.forEach(uq => {
            const cols = uq.columnIds?.map(id => {
                const col = table.columns.find(c => c.id === id);
                return col ? col.name : null;
            }).filter(Boolean) || [];

            if (cols.length > 0) {
                const constraintName = `uq_${table.name}_` + cols.join('_');
                colDefs.push(`  CONSTRAINT ${constraintName} UNIQUE (${cols.join(', ')})`);
            }
        });
    }

    sql += colDefs.join(',\n');
    sql += '\n);\n\n';
  });

  relationships.forEach(rel => {
      const fromTable = tables.find(t => t.id === rel.from);
      const toTable = tables.find(t => t.id === rel.to);
      if (fromTable && toTable) {
           const relType = rel.type === 'identifying' ? 'Identifying (Parent-Child)' : 'Non-Identifying (Reference)';
           sql += `-- Relation: ${fromTable.name}(1) --- (N)${toTable.name} [${relType}]\n`;
      }
  });
  sql += '\n';

  if (tableFks.length > 0) {
      sql += `-- Foreign Keys (Support Composite Foreign Keys)\n`;
      tableFks.forEach(fk => {
          const childCols = fk.mappings.map(m => m.childColName).join(', ');
          const parentCols = fk.mappings.map(m => m.parentColName).join(', ');
          const constraintName = `fk_${fk.fromTable}_to_${fk.toTable}_` + fk.mappings.map(m => m.childColName).join('_');
          sql += `ALTER TABLE ${fk.fromTable} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${childCols}) REFERENCES ${fk.toTable}(${parentCols});\n`;
      });
      sql += '\n';
  } 

  const tablesWithData = tables.filter(t => t.rows.length > 0);
  if (tablesWithData.length > 0) {
      sql += `-- Example Data --\n`;
      tablesWithData.forEach(table => {
          if (table.rows.length === 0) return;
          const colNames = table.columns.map(c => c.name).join(', ');
          table.rows.forEach(row => {
              const values = table.columns.map(col => {
                  const val = row[col.id];
                  if (val === undefined || val === null || val === '') return 'NULL';
                  if (['INT','BIGINT','DECIMAL','FLOAT'].some(t => col.type.startsWith(t))) {
                      return val;
                  }
                  return `'${val.replace(/'/g, "''")}'`;
              }).join(', ');
              sql += `INSERT INTO ${table.name} (${colNames}) VALUES (${values});\n`;
          });
          sql += '\n';
      });
  }
  return sql;
};
