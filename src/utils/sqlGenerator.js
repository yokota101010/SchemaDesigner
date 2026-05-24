export const generateSQL = (tables, relationships) => {
  let sql = '';
  
  const columnFks = []; 
  tables.forEach(t => {
      t.columns.forEach(c => {
          if (c.isFk && c.reference && c.reference.tableId && c.reference.columnId) {
              const targetTable = tables.find(tbl => tbl.id === c.reference.tableId);
              const targetCol = targetTable?.columns.find(col => col.id === c.reference.columnId);
              if (targetTable && targetCol) {
                  columnFks.push({
                      fromTable: t.name,
                      fromCol: c.name,
                      toTable: targetTable.name,
                      toCol: targetCol.name
                  });
              }
          }
      });
  });

  tables.forEach(table => {
    sql += `CREATE TABLE ${table.name} (\n`;
    
    const colDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (col.isUnique && !col.isPk) { 
          def += ' UNIQUE';
      }
      if (col.attributeType === 'dependent') {
          const derivation = col.derivation ? ` [${col.derivation}]` : '';
          def += ` /* Derived (導出項目)${derivation} */`;
      }
      return def;
    });
    sql += colDefs.join(',\n');

    const pkCols = table.columns.filter(c => c.isPk);
    if (pkCols.length > 0) {
        const pkNames = pkCols.map(c => c.name).join(', ');
        sql += `,\n  PRIMARY KEY (${pkNames})`;
    }

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

  if (columnFks.length > 0) {
      sql += `-- Foreign Keys (Defined in Columns)\n`;
      columnFks.forEach(fk => {
          sql += `ALTER TABLE ${fk.fromTable} ADD CONSTRAINT fk_${fk.fromTable}_${fk.fromCol} FOREIGN KEY (${fk.fromCol}) REFERENCES ${fk.toTable}(${fk.toCol});\n`;
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
